// UI の文言(学習者の言語 = タイ語)。タイ語ネイティブ確認前の下書き。ADR-0022。
import type { Dict } from "./ja";

export const th: Dict = {
  notation: "การเขียน",
  lite: "แบบย่อ",
  full: "แบบเต็ม",
  speakerGender: "เพศของฉัน",
  genderUnset: "ไม่ระบุ (ทั้งสองแบบ)",
  male: "ชาย",
  female: "หญิง",
  unreviewed: "ยังไม่ตรวจสอบ",
  howWords: "โครงสร้างของคำ",
  splitAria: "แบ่งคำ",
  casualForm: "แบบไม่เป็นทางการ",
  practiceToday: "ฝึกวันนี้",
  guideLink: "วิธีอ่านตัวเขียน",
  scenes: "สถานการณ์",
  backToScenes: "← รายการสถานการณ์",
  noPhrases: "ยังไม่มีประโยคที่เผยแพร่",
  remaining: (n) => `เหลืออีก ${n} ใบ`,
  showAnswer: "ดูคำตอบ",
  ratings: { again: "อีกครั้ง", hard: "ยาก", good: "พูดได้", easy: "ง่าย" },
  loading: "กำลังโหลด…",
  noCardsToday: "วันนี้ไม่มีการ์ดที่ต้องฝึก",
  finishedToday: "ฝึกวันนี้เสร็จแล้ว เก่งมาก",
  saveError: (e) => `บันทึกความคืบหน้าไม่ได้: ${e}`,
  pos: {
    noun: "คำนาม", pron: "คำสรรพนาม", verb: "คำกริยา", adj: "คำคุณศัพท์", adv: "คำวิเศษณ์",
    particle: "คำช่วย", prep: "คำบุพบท", question: "คำถาม", interj: "คำอุทาน",
  },
  role: { S: "ประธาน", V: "กริยา", O: "กรรม" },
  wordOrder: (roles) => `ลำดับคำ: ${roles}`,
};
