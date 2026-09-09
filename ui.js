const UI = {
  // สลับหน้าแท็บ
  switchTab: async function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active', 'text-mango-400'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active', 'text-mango-400');

    if (tabName === 'orchard') {
      await this.renderOrchards();
    } else if (tabName === 'tasks') {
      this.renderTasks();
      await this.populateOrchardDropdown();
    }
  },

  // --- จัดการแปลงปลูก ---
  renderOrchards: async function() {
    const listContainer = document.getElementById('orchard-list');
    if (!listContainer) return;

    const list = window.ORCHARDS ? await window.ORCHARDS.getAll() : [];
    if (list.length === 0) {
      listContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">ยังไม่มีข้อมูลแปลงปลูก</div>`;
      return;
    }

    listContainer.innerHTML = list.map(item => `
      <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between items-center">
        <div>
          <h3 class="font-bold text-mango-400 text-sm">${item.name}</h3>
          <p class="text-[10px] text-slate-400 mt-0.5">ขนาด: ${item.area || '-'} | จำนวน: ${item.trees || 0} ต้น</p>
        </div>
        <button onclick="UI.deleteOrchard('${item.id}')" class="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] rounded-lg border border-red-500/20">ลบ</button>
      </div>
    `).join('');
  },

  addOrchardFromForm: async function(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('orchard-name')?.value.trim();
    if (!name) return alert('กรุณากรอกชื่อแปลงปลูก');

    try {
      await window.ORCHARDS.save({
        name: name,
        area: document.getElementById('orchard-area')?.value.trim() || '',
        trees: Number(document.getElementById('orchard-trees')?.value || 0),
        location: document.getElementById('orchard-location')?.value.trim() || ''
      });

      document.getElementById('orchard-name').value = '';
      document.getElementById('orchard-area').value = '';
      document.getElementById('orchard-trees').value = '';
      document.getElementById('orchard-location').value = '';

      await this.renderOrchards();
    } catch (error) {
      console.error('Add orchard failed:', error);
      alert(error?.message || 'บันทึกข้อมูลสวนไม่สำเร็จ');
    }
  },

  deleteOrchard: async function(id) {
    if (!confirm('ยืนยันการลบแปลงปลูก?')) return;
    try {
      await window.ORCHARDS.delete(id);
      await this.renderOrchards();
    } catch (error) {
      console.error('Delete orchard failed:', error);
      alert(error?.message || 'ลบข้อมูลสวนไม่สำเร็จ');
    }
  },

  // --- จัดการงานสวน ---
  populateOrchardDropdown: async function() {
    const dropdown = document.getElementById('task-orchard');
    if (!dropdown) return;

    const orchards = window.ORCHARDS ? await window.ORCHARDS.getAll() : [];
    dropdown.innerHTML = '<option value="">เลือกแปลงปลูก (ไม่ระบุ)</option>' +
      orchards.map(o => `<option value="${o.name}">${o.name}</option>`).join('');
  },

  renderTasks: function() {
    const listContainer = document.getElementById('task-list');
    if (!listContainer) return;

    const list = window.TASKS ? window.TASKS.getAll() : [];
    if (list.length === 0) {
      listContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">ยังไม่มีงานสวนที่บันทึกไว้</div>`;
      return;
    }

    listContainer.innerHTML = list.map(item => `
      <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2 ${item.completed ? 'opacity-50' : ''}">
        <div class="flex items-center gap-3">
          <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="UI.toggleTask('${item.id}')" class="w-4 h-4 accent-mango-500 rounded cursor-pointer">
          <div>
            <h4 class="font-bold text-xs ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}">${item.title}</h4>
            <p class="text-[10px] text-slate-400">${item.orchardName ? 'แปลง: ' + item.orchardName + ' | ' : ''}กำหนด: ${item.dueDate || 'ไม่ระบุ'}</p>
          </div>
        </div>
        <button onclick="UI.deleteTask('${item.id}')" class="text-red-400 text-xs px-2 py-1">ลบ</button>
      </div>
    `).join('');
  },

  addTaskFromForm: function(e) {
    if (e) e.preventDefault();
    const title = document.getElementById('task-title')?.value.trim();
    if (!title) return alert('กรุณากรอกหัวข้องาน');

    window.TASKS.save({
      title: title,
      orchardName: document.getElementById('task-orchard')?.value || '',
      dueDate: document.getElementById('task-date')?.value || ''
    });

    document.getElementById('task-title').value = '';
    document.getElementById('task-date').value = '';

    this.renderTasks();
  },

  toggleTask: function(id) {
    window.TASKS.toggleComplete(id);
    this.renderTasks();
  },

  deleteTask: function(id) {
    if (confirm('ยืนยันการลบงานสวนนี้?')) {
      window.TASKS.delete(id);
      this.renderTasks();
    }
  },

  // --- AI Decision ---
  runAIDecision: function(e) {
    if (e) e.preventDefault();
    const stage = document.getElementById('ai-stage')?.value || 'RECOVERY';
    const temp = Number(document.getElementById('ai-temp')?.value || 32);
    const moisture = Number(document.getElementById('ai-moisture')?.value || 50);
    const anthracnose = document.getElementById('ai-anthracnose')?.value || 'LOW';
    const jassid = document.getElementById('ai-jassid')?.value || 'LOW';

    if (window.DECISION_ENGINE) {
      const result = window.DECISION_ENGINE.evaluate(stage, temp, moisture, anthracnose, jassid);
      window.DECISION_ENGINE.renderResult(result);
    }
  },

  // --- คำนวณปุ๋ย ---
  calculateFertilizer: function(e) {
    if (e) e.preventDefault();
    const age = Number(document.getElementById('fert-age')?.value || 1);
    const trees = Number(document.getElementById('fert-trees')?.value || 1);

    if (window.FERTILIZER_CALCULATOR) {
      const res = window.FERTILIZER_CALCULATOR.calculateRequirement(age, trees);
      
      const totalFertEl = document.getElementById('res-total-fert');
      const rateTreeEl = document.getElementById('res-rate-tree');
      const formulaEl = document.getElementById('res-formula');
      const noteEl = document.getElementById('res-note');
      
      if (totalFertEl) totalFertEl.textContent = `${res.totalFertilizer} กก./ปี`;
      if (rateTreeEl) rateTreeEl.textContent = res.ratePerTree;
      if (formulaEl) formulaEl.textContent = res.recommendedFormula;
      if (noteEl) noteEl.textContent = `* ${res.stageNote}`;
      
      document.getElementById('fert-result')?.classList.remove('hidden');
    }
  }
};

window.UI = UI;
