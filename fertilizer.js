const FERTILIZER_CALCULATOR = {
  // ฟังก์ชันคำนวณปริมาณปุ๋ยที่แนะนำ (กก./ต้น/ปี) ตามช่วงอายุ
  calculateRequirement: function(ageYears, treeCount = 1) {
    let ratePerTree = 0; // กิโลกรัม / ต้น / ปี
    let recommendedFormula = '';
    let stageNote = '';

    if (ageYears <= 1) {
      ratePerTree = 0.5;
      recommendedFormula = '25-7-7 หรือ 16-16-16 (เน้นเร่งต้นและใบ)';
      stageNote = 'ใส่ครั้งละน้อยแต่บ่อยครั้ง (แบ่งใส่ทุก 1-2 เดือน)';
    } else if (ageYears <= 3) {
      ratePerTree = 1.5;
      recommendedFormula = '16-16-16 หรือ 24-7-7';
      stageNote = 'บำรุงทรงพุ่มและสร้างสะสมอาหาร (แบ่งใส่ 3-4 ครั้ง/ปี)';
    } else if (ageYears <= 6) {
      ratePerTree = 3.0;
      recommendedFormula = '8-24-24 (สะสมอาหาร/ดึงดอก) และ 15-0-0 (เร่งผล)';
      stageNote = 'เริ่มให้ผลผลิตแล้ว แบ่งใส่ตามระยะเจริญเติบโต';
    } else {
      // ต้นอายุ 7 ปีขึ้นไป
      ratePerTree = Math.min(ageYears * 0.6, 8.0);
      recommendedFormula = '8-24-24 (ก่อนติดดอก) + 13-13-21 (ขยายผล) + 16-16-16 (ฟื้นฟูหลังเก็บเกี่ยว)';
      stageNote = 'ต้นให้ผลเต็มที่ เน้นใส่ตามช่วงระยะการให้ผลผลิต';
    }

    const totalFertilizer = ratePerTree * treeCount;

    return {
      ageYears: ageYears,
      treeCount: treeCount,
      ratePerTree: ratePerTree.toFixed(1),
      totalFertilizer: totalFertilizer.toFixed(1),
      recommendedFormula: recommendedFormula,
      stageNote: stageNote
    };
  }
};

window.FERTILIZER_CALCULATOR = FERTILIZER_CALCULATOR;
