const PHOTO_ANALYSIS = {
  BUCKET: 'orchard-photos',
  FUNCTION_URL: 'https://oxplceitowvaqencyntg.supabase.co/functions/v1/analyze-orchard-photo',

  init: function () {
    this.mountUI();
    const input = document.getElementById('photo-analysis-input');
    if (input && !input.dataset.bound) {
      input.dataset.bound = '1';
      input.addEventListener('change', (e) => this.analyzeFile(e.target.files?.[0]));
    }
  },

  mountUI: function () {
    if (document.getElementById('photo-analysis-panel')) return;
    const aiTab = document.getElementById('tab-ai');
    if (!aiTab) return;
    const panel = document.createElement('div');
    panel.id = 'photo-analysis-panel';
    panel.className = 'glass-panel rounded-2xl p-4 space-y-3 border border-mango-500/30';
    panel.innerHTML = `
      <div class="flex items-center gap-2">
        <i data-lucide="camera" class="w-4 h-4 text-mango-400"></i>
        <div><h2 class="text-sm font-bold text-slate-100">วิเคราะห์จากรูปถ่าย</h2><p class="text-[10px] text-slate-400">ถ่าย/เลือกรูปใบ กิ่ง หรือผล เพื่อให้ AI ประเมินอาการ</p></div>
      </div>
      <label class="block cursor-pointer">
        <input id="photo-analysis-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" class="hidden">
        <span class="flex items-center justify-center gap-2 w-full py-3 bg-mango-500 hover:bg-mango-600 text-slate-950 font-bold text-xs rounded-xl">📷 ถ่ายรูป / เลือกรูป</span>
      </label>
      <p id="photo-analysis-status" class="text-[10px] text-slate-400 text-center min-h-4">เข้าสู่ระบบก่อนเริ่มวิเคราะห์</p>
      <img id="photo-analysis-preview" class="hidden w-full max-h-64 object-contain rounded-xl border border-slate-800 bg-slate-950" alt="ภาพที่เลือก">
      <div id="photo-analysis-result"></div>`;
    aiTab.insertBefore(panel, aiTab.firstChild);
    if (window.lucide) lucide.createIcons();
  },

  analyzeFile: async function (file) {
    if (!file) return;
    if (!supabaseClient || !STATE.user) { this.setStatus('กรุณาเข้าสู่ระบบก่อนวิเคราะห์รูป'); return; }
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) { this.setStatus('รองรับ JPG, PNG, WebP และ HEIC เท่านั้น'); return; }
    if (file.size > 6 * 1024 * 1024) { this.setStatus('รูปใหญ่เกิน 6 MB กรุณาเลือกรูปที่เล็กลง'); return; }

    const preview = document.getElementById('photo-analysis-preview');
    this.setStatus('กำลังอัปโหลดและวิเคราะห์ด้วย AI…');
    if (preview) { preview.src = URL.createObjectURL(file); preview.classList.remove('hidden'); }

    let rowId = null;
    try {
      const userId = STATE.user.id;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseClient.storage.from(this.BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabaseClient.from('photo_analyses').insert({ user_id: userId, orchard_id: STATE.currentOrchardId || null, image_path: path, image_content_type: file.type, analysis_status: 'pending' }).select('id').single();
      if (insertError) throw insertError;
      rowId = row.id;

      const imageBase64 = await this.fileToBase64(file);
      const token = await AUTH.getAccessToken();
      const response = await fetch(this.FUNCTION_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ image_base64: imageBase64, mime_type: file.type, context: this.getContext() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'AI วิเคราะห์ภาพไม่สำเร็จ');

      const analysis = data.analysis || {};
      const { error: updateError } = await supabaseClient.from('photo_analyses').update({ analysis_status: 'completed', analysis }).eq('id', rowId).eq('user_id', userId);
      if (updateError) throw updateError;
      this.renderResult(analysis);
      this.setStatus('วิเคราะห์ภาพเสร็จแล้ว');
    } catch (error) {
      console.error('Photo analysis failed:', error);
      if (rowId && supabaseClient) await supabaseClient.from('photo_analyses').update({ analysis_status: 'failed', analysis: { error: error?.message || 'unknown' } }).eq('id', rowId).eq('user_id', STATE.user.id);
      this.setStatus(error?.message || 'วิเคราะห์ภาพไม่สำเร็จ');
    }
  },

  fileToBase64: function (file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); },
  getContext: function () { const orchard = (STATE.orchards || []).find(o => o.id === STATE.currentOrchardId); return orchard ? `แปลง: ${orchard.name}, จำนวนต้น: ${orchard.trees || orchard.tree_count || 0}` : 'ยังไม่ได้ระบุแปลง'; },
  setStatus: function (text) { const el = document.getElementById('photo-analysis-status'); if (el) el.textContent = text; },
  renderResult: function (a) {
    const el = document.getElementById('photo-analysis-result'); if (!el) return;
    const findings = Array.isArray(a.findings) ? a.findings : [], actions = Array.isArray(a.recommended_actions) ? a.recommended_actions : [];
    const esc = (v) => String(v ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
    el.innerHTML = `<div class="p-3 bg-slate-900/90 border border-mango-500/30 rounded-xl space-y-3"><div class="flex items-center justify-between"><span class="text-mango-400 font-bold">ผลวิเคราะห์</span><span class="text-[10px] px-2 py-1 rounded-full bg-slate-800">ความรุนแรง: ${esc(a.severity || 'UNKNOWN')}</span></div><p class="text-xs text-slate-200">${esc(a.summary_th || 'ไม่พบสรุปผล')}</p>${findings.length ? `<div><p class="text-[10px] text-slate-400 mb-1">สิ่งที่พบ</p><ul class="space-y-1">${findings.map(f => `<li class="text-xs text-slate-300">• ${esc(f.label)} <span class="text-slate-500">(${esc(f.confidence || 'ไม่ระบุ')})</span><br><span class="text-[10px] text-slate-500">${esc(f.evidence || '')}</span></li>`).join('')}</ul></div>` : ''}${actions.length ? `<div><p class="text-[10px] text-slate-400 mb-1">คำแนะนำเบื้องต้น</p><ul class="space-y-1">${actions.map(x => `<li class="text-xs text-slate-300">• ${esc(x)}</li>`).join('')}</ul></div>` : ''}<p class="text-[10px] text-slate-500">คุณภาพภาพ: ${esc(a.image_quality || 'ไม่ระบุ')} · ${esc(a.caution_th || 'ผลจาก AI ควรตรวจสอบกับสภาพจริง')}</p></div>`;
  }
};
window.PHOTO_ANALYSIS = PHOTO_ANALYSIS;
