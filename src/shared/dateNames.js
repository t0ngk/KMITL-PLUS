// ชื่อวัน/เดือนย่อของหน้า reg เป็น format ตายตัวของระบบเก่า ("จ." "พฤ." "ม.ค.")
// จงใจเป็นค่าคงที่ ไม่ generate จาก Intl — ตรวจกับ Chrome จริงแล้ว Intl ให้ค่าไม่ตรง:
// th-TH weekday short = "จันทร์", narrow = "จ" (ไม่มีจุด) และผลยังต่างจาก node อีกด้วย
// format ของ reg ไม่มีวันเปลี่ยน แต่ ICU ของ browser เปลี่ยนได้ — ค่าคงที่จึงเสถียรกว่า

// index 0..6 = จันทร์..อาทิตย์ (Monday-first ทั้งสองภาษา)
export const thaiDays = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
export const englishDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayIndexByName = new Map([
  ...thaiDays.map((name, index) => [name, index]),
  ...englishDays.map((name, index) => [name, index]),
]);

// "จ." หรือ "Mon" -> 0 ; ไม่รู้จัก -> -1
export function dayIndexOf(text) {
  return dayIndexByName.get(text) ?? -1;
}

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const englishMonths = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const monthNumberByName = new Map(
  [...thaiMonths, ...englishMonths].map((name, index) => [
    name,
    (index % 12) + 1,
  ]),
);

// "พ.ย." หรือ "Nov" -> 11 ; ไม่รู้จัก -> NaN (คงพฤติกรรม Invalid Date เดิม)
export function monthNumberOf(text) {
  return monthNumberByName.get(text) ?? NaN;
}
