// สีฐานของวิชา — ค่าที่แสดงจริงเป็น tint/หมึกที่ derive จาก hue เหล่านี้ (shared/colors.js)
// ไม่มีส้มในชุดนี้โดยตั้งใจ : ส้ม #E35205 ถูกสงวนให้สถานะของระบบเท่านั้น
// hue ห่างกันอย่างน้อย ~25° ทุกคู่ : บล็อกวิชาเหลือแค่ tint กับหมึกเป็นสัญญาณสี
// สีที่อยู่ติดกันบนวงล้อ (แดง-ชมพู-กุหลาบ) จะกลายเป็นบล็อกหน้าตาเดียวกัน
export const PALETTE = [
  "#ef4444",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#d946ef",
  "#ec4899",
];

export const DEFAULT_HEADER_COLOR = "#E35205";

// FNV-1a : subjectId เดิม -> ช่อง palette เดิมเสมอ ข้ามการ reload และข้ามภาคเรียน
function hashOf(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * ให้สีแต่ละวิชาแบบ deterministic : ตารางเดียวกันได้สีชุดเดียวกันทุกครั้ง
 * ชนช่องกันแล้วเลื่อนไปช่องถัดไป (ยังคงที่ เพราะ schedule เรียงมาแล้ว)
 * วิชามากกว่าจำนวนสีใน palette จะยอมใช้สีซ้ำ แทนการวนหาไม่รู้จบ
 */
export function makeTheme(scheduleItems) {
  const theme = [];
  const taken = new Set();
  scheduleItems.forEach((item) => {
    if (theme.some((entry) => entry.subjectId === item.subjectId)) {
      return;
    }
    let index = hashOf(item.subjectId) % PALETTE.length;
    for (let step = 0; step < PALETTE.length && taken.has(index); step += 1) {
      index = (index + 1) % PALETTE.length;
    }
    taken.add(index);
    theme.push({
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      color: PALETTE[index],
    });
  });
  return theme;
}

export function getTheme(theme, subjectId) {
  const filtered = theme.filter((item) => item.subjectId === subjectId);
  if (filtered.length > 0) {
    return filtered[0].color;
  } else {
    return false;
  }
}
