const AUTH = {
  _initialized: false,
  _authMode: 'login',

  getRedirectUrl: function() {
    // OAuth must always return to the production URL that is registered in Supabase/GitHub.
    return 'https://mango-ai-frontend.vercel.app/';
  },

  init: async function() {
    if (this._initialized) return;
    this._initialized = true;
    this.ensureWidget();
    if (!supabaseClient) { this.setStatus('Supabase ยังไม่พร้อม'); return; }

    // PKCE callback: explicitly exchange the authorization code before reading the session.
    // This makes Google OAuth reliable on Safari/iPad where the callback can arrive with ?code=...
    try {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        this.setStatus('กำลังยืนยันการเข้าสู่ระบบ…');
        const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
      }
    } catch (error) {
      console.error('OAuth code exchange failed', error);
      this.setStatus('ยืนยันการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
      window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) console.error('Get session failed', error);
    this.applySession(session);
    supabaseClient.auth.onAuthStateChange((_event, nextSession) => this.applySession(nextSession));
    this.handleAuthRedirectError();
  },

  ensureWidget: function() {
    if (document.getElementById('mango-auth-widget')) return;
    const header = document.querySelector('header');
    if (!header) return;
    const widget = document.createElement('div');
    widget.id = 'mango-auth-widget';
    widget.className = 'flex items-center gap-1.5 ml-2';
    widget.innerHTML = `
      <span id="auth-status" class="hidden sm:inline text-[9px] text-slate-400">Guest mode</span>
      <span id="auth-user" class="hidden text-[9px] text-slate-300 max-w-24 truncate">Guest</span>
      <button id="auth-login-btn" type="button" onclick="AUTH.openAuthModal('login')" class="px-2 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-[9px] font-semibold">เข้าสู่ระบบ / สมัครสมาชิก</button>
      <button id="auth-logout-btn" type="button" onclick="AUTH.signOut()" class="hidden px-2 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[9px]">ออก</button>`;
    const headerRight = header.querySelector('.flex.items-center.gap-2:last-child');
    if (headerRight) headerRight.appendChild(widget); else header.appendChild(widget);
    this.ensureModal();
  },

  ensureModal: function() {
    if (document.getElementById('mango-auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'mango-auth-modal';
    modal.className = 'hidden fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center';
    modal.innerHTML = `
      <div class="w-full max-w-sm glass-panel rounded-2xl p-5 shadow-2xl border border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <div><h2 id="auth-modal-title" class="text-base font-bold text-slate-100">เข้าสู่ระบบ</h2><p id="auth-modal-subtitle" class="text-[10px] text-slate-400 mt-1">เข้าใช้ Mango AI ด้วยอีเมล หรือ Google</p></div>
          <button type="button" onclick="AUTH.closeAuthModal()" class="text-slate-400 hover:text-white text-lg">✕</button>
        </div>
        <form id="auth-email-form" onsubmit="AUTH.submitEmailAuth(event)" class="space-y-3">
          <input id="auth-email" type="email" autocomplete="email" required placeholder="อีเมล" class="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl p-3 text-slate-100 focus:outline-none focus:border-mango-500">
          <input id="auth-password" type="password" autocomplete="current-password" required minlength="6" placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร" class="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl p-3 text-slate-100 focus:outline-none focus:border-mango-500">
          <button id="auth-email-submit" type="submit" class="w-full py-2.5 bg-mango-500 hover:bg-mango-600 text-slate-950 font-bold text-xs rounded-xl">เข้าสู่ระบบ</button>
        </form>
        <button type="button" onclick="AUTH.signInWithGoogle()" class="w-full mt-2 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl border border-slate-300">เข้าสู่ระบบด้วย Google</button>
        <button id="auth-mode-toggle" type="button" onclick="AUTH.toggleAuthMode()" class="w-full mt-3 text-[10px] text-mango-400">ยังไม่มีบัญชี? สมัครสมาชิก</button>
        <p id="auth-form-message" class="text-[10px] text-center text-slate-400 mt-3 min-h-4"></p>
      </div>`;
    document.body.appendChild(modal);
  },

  openAuthModal: function(mode) { this.ensureModal(); this._authMode = mode === 'signup' ? 'signup' : 'login'; this.updateAuthModal(); document.getElementById('mango-auth-modal').classList.remove('hidden'); },
  closeAuthModal: function() { document.getElementById('mango-auth-modal')?.classList.add('hidden'); },
  toggleAuthMode: function() { this._authMode = this._authMode === 'login' ? 'signup' : 'login'; this.updateAuthModal(); },

  updateAuthModal: function() {
    const signup = this._authMode === 'signup';
    document.getElementById('auth-modal-title').textContent = signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
    document.getElementById('auth-modal-subtitle').textContent = signup ? 'สร้างบัญชี Mango AI ด้วยอีเมล หรือ Google' : 'เข้าใช้ Mango AI ด้วยอีเมล หรือ Google';
    document.getElementById('auth-email-submit').textContent = signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
    document.getElementById('auth-mode-toggle').textContent = signup ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก';
    document.getElementById('auth-password').autocomplete = signup ? 'new-password' : 'current-password';
    this.setFormMessage('');
  },

  submitEmailAuth: async function(event) {
    event.preventDefault();
    if (!supabaseClient) return this.setFormMessage('Supabase ยังไม่พร้อม', true);
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const submit = document.getElementById('auth-email-submit');
    submit.disabled = true;
    this.setFormMessage(this._authMode === 'signup' ? 'กำลังสร้างบัญชี…' : 'กำลังเข้าสู่ระบบ…');
    try {
      if (this._authMode === 'signup') {
        const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: this.getRedirectUrl() } });
        if (error) throw error;
        if (data.session) { this.closeAuthModal(); this.setStatus('สมัครสมาชิกและเข้าสู่ระบบแล้ว'); }
        else this.setFormMessage('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี');
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.closeAuthModal(); this.setStatus('เข้าสู่ระบบแล้ว');
      }
    } catch (error) {
      console.error('Email authentication failed', error);
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) this.setFormMessage('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', true);
      else if (msg.includes('invalid login credentials')) this.setFormMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง', true);
      else if (msg.includes('already registered')) this.setFormMessage('อีเมลนี้มีบัญชีอยู่แล้ว ให้เข้าสู่ระบบแทน', true);
      else this.setFormMessage(error?.message || 'ดำเนินการไม่สำเร็จ', true);
    } finally { submit.disabled = false; }
  },

  setFormMessage: function(text, isError) { const el = document.getElementById('auth-form-message'); if (el) { el.textContent = text; el.className = `text-[10px] text-center mt-3 min-h-4 ${isError ? 'text-red-400' : 'text-slate-400'}`; } },

  signInWithGoogle: async function() {
    if (!supabaseClient) { this.setStatus('Supabase ยังไม่พร้อม'); return; }
    this.setStatus('กำลังเข้าสู่ระบบด้วย Google…');
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: this.getRedirectUrl(), queryParams: { prompt: 'select_account' } } });
    if (error) {
      console.error('Google sign-in failed', error);
      const message = String(error.message || '').toLowerCase();
      if (message.includes('provider') && message.includes('not enabled')) this.setStatus('Google ยังไม่ได้เปิดใน Supabase');
      else if (message.includes('redirect')) this.setStatus('Redirect URL ยังไม่ได้อนุญาตใน Supabase');
      else this.setStatus('เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
    }
  },

  handleAuthRedirectError: function() {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const error = hashParams.get('error_description') || queryParams.get('error_description');
    if (!error) return;
    console.error('OAuth callback error:', error); this.setStatus(decodeURIComponent(error).slice(0, 80));
    window.setTimeout(() => window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`), 500);
  },

  signOut: async function() { if (!supabaseClient) return; this.setStatus('กำลังออกจากระบบ…'); const { error } = await supabaseClient.auth.signOut(); if (error) { console.error(error); this.setStatus('ออกจากระบบไม่สำเร็จ'); return; } this.applySession(null); },
  getAccessToken: async function() { if (!supabaseClient) return null; const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) return null; return session?.access_token || null; },

  requestAI: async function(prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('กรุณาระบุคำถาม');
    const token = await this.getAccessToken(); if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน Mango AI');
    const response = await fetch(CONFIG.EDGE_FUNC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ prompt: prompt.trim() }) });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Mango AI API request failed'); return data.response || '';
  },

  applySession: function(session) {
    STATE.user = session?.user || null; STATE.isGuest = !STATE.user;
    const userEl = document.getElementById('auth-user'), loginBtn = document.getElementById('auth-login-btn'), logoutBtn = document.getElementById('auth-logout-btn');
    if (userEl) { userEl.textContent = STATE.user ? (STATE.user.user_metadata?.full_name || STATE.user.user_metadata?.name || STATE.user.email || 'ผู้ใช้ที่เข้าสู่ระบบ') : 'Guest'; userEl.classList.toggle('hidden', !STATE.user); }
    if (loginBtn) loginBtn.classList.toggle('hidden', Boolean(STATE.user));
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !STATE.user);
    this.setStatus(STATE.user ? 'Signed in' : 'Guest mode');
  },
  setStatus: function(text) { const el = document.getElementById('auth-status'); if (el) el.textContent = text; }
};
window.AUTH = AUTH;
