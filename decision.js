const DECISION_ENGINE = {
  // กฎการประเมินความเสี่ยงและคำแนะนำ (Rule Matrix)
  evaluate: function(stage, temp, moisture, anthracnoseRisk, jassidRisk) {
    let status = 'NORMAL'; // NORMAL, WARNING, CRITICAL
    let adviceList = [];
    let warnings = [];

    // 1. ประเมินตามระยะพัฒนาการ
    switch (stage) {
      case 'RECOVERY':
        adviceList.push('ระยะฟื้นฟูต้น: แนะนำตัดแต่งกิ่งโปร่ง และใส่ปุ๋ยบำรุงต้น/ใบ (สูตรไนโตรเจนสูง เช่น 25-7-7)');
        break;
      case 'FLOWER_INDUCTION':
        adviceList.push('ระยะสะสมอาหาร: งดน้ำชั่วคราวเพื่อกระตุ้นการตาดอก และเตรียมพ่นสารดึงดอกตามรอบ');
        break;
      case 'BLOOMING':
        adviceList.push('ระยะดอกบาน: หลีกเลี่ยงการพ่นสารเคมีรุนแรงช่วงเช้าเพื่อปกป้องแมลงช่วยผสมเกสร');
        break;
      case 'FRUIT_DEVELOPMENT':
        adviceList.push('ระยะขยายขนาดผล: ควบคุมการให้น้ำอย่างสม่ำเสมอ และใส่ปุ๋ยเพิ่มคุณภาพผลผลิต (สูตรโพแทสเซียมสูง)');
        break;
      default:
        adviceList.push('บันทึกข้อมูลและติดตามอาการของต้นมะม่วงอย่างสม่ำเสมอ');
    }

    // 2. ประเมินความชื้นในดิน
    if (moisture < 30) {
      status = 'WARNING';
      warnings.push('ความชื้นในดินต่ำเกินไป (<30%) เสี่ยงต่อการชะงักการเจริญเติบโต ควรให้น้ำเพิ่ม');
    } else if (moisture > 80) {
      status = 'WARNING';
      warnings.push('ความชื้นในดินสูงเกินไป (>80%) ระวังโรครากเน่าโคนเน่า');
    }

    // 3. ประเมินความเสี่ยงโรคแอนแทรคโนส
    if (anthracnoseRisk === 'HIGH') {
      status = 'CRITICAL';
      warnings.push('ความเสี่ยงโรคแอนแทรคโนสสูง! แนะนำพ่นสารป้องกันกำจัดเชื้อรา (เช่น คาร์เบนดาซิม หรือ อะซอกซีสโตรบิน)');
    }

    // 4. ประเมินความเสี่ยงเพลี้ยจักจั่น
    if (jassidRisk === 'HIGH') {
      if (status !== 'CRITICAL') status = 'WARNING';
      warnings.push('ระวังเพลี้ยจักจั่นมะม่วงระบาด! สำรวจยอดอ่อน/ช่อดอก หากพบให้ใช้สารกำจัดแมลงที่เหมาะสม');
    }

    return {
      status: status,
      warnings: warnings,
      adviceList: adviceList,
      timestamp: new Date().toLocaleTimeString('th-TH')
    };
  },

  // แสดงผลลัพธ์การวิเคราะห์ลงบน UI
  renderResult: function(result) {
    const container = document.getElementById('decision-result-container');
    if (!container) return;

    let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    let statusText = 'ปกติ / สภาวะเหมาะสม';

    if (result.status === 'WARNING') {
      badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      statusText = 'เฝ้าระวัง';
    } else if (result.status === 'CRITICAL') {
      badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30';
      statusText = 'เตือนภัย / ต้องรับการแก้ไข';
    }

    container.innerHTML = `
      <div class="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 mt-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-300">ผลการวิเคราะห์ AI (${result.timestamp})</span>
          <span class="px-2 py-0.5 text-[10px] rounded-full border ${badgeColor} font-bold">${statusText}</span>
        </div>
        
        ${result.warnings.length > 0 ? `
          <div class="text-xs text-red-400 space-y-1 bg-red-950/30 p-2 rounded-lg border border-red-900/40">
            ${result.warnings.map(w => `<p>⚠️ ${w}</p>`).join('')}
          </div>
        ` : ''}

        <div class="text-xs text-slate-300 space-y-1 bg-slate-800/50 p-2 rounded-lg">
          <p class="font-semibold text-mango-400">💡 คำแนะนำการดูแล:</p>
          ${result.adviceList.map(a => `<p>• ${a}</p>`).join('')}
        </div>
      </div>
    `;
  }
};

window.DECISION_ENGINE = DECISION_ENGINE;
