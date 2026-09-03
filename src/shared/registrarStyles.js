// stylesheet ของหน้า reg (css/registrar.css) เต็มไปด้วย selector ระดับ element
// ล้วน ๆ — SELECT, TD, INPUT, A — และไม่ได้อยู่ใน @layer ใด ๆ
//
// utility ของ tailwind 4 อยู่ใน @layer utilities ส่วนกฎของ reg เป็น unlayered
// ตามสเปก cascade layers แล้ว "unlayered ชนะ layered เสมอ ไม่ว่า specificity จะเป็นยังไง"
// -> `SELECT { font-size: 11px }` ของ reg ชนะ `.text-[13px]` ของเรา และไม่มี class ไหน
//    เอาชนะได้เลยนอกจากใช้ !important ซึ่งแย่กว่า
//
// จึงต้อง "ปิด" ไม่ใช่ "ลบ" : โหมดแบบเดิมคือ markup ของ reg เอง ที่ต้องได้ style
// ของตัวเองกลับมาถึงจะเหมือนหน้าจริง ลบทิ้งแล้วเรียกคืนต้องโหลดใหม่และเห็นหน้าเปล่าแวบหนึ่ง

let captured = [];

/**
 * จำ stylesheet ของหน้า reg ไว้ตอนที่เอกสารยังเป็นของเดิมล้วน ๆ
 *
 * ต้องเรียกก่อนที่เราจะเติมอะไรลง <head> : ถ้าไปไล่หา "ทุกอันที่ไม่ใช่ของเรา"
 * ทีหลังจะกลายเป็นการเดา CSS ของ content script ที่ Chrome inject ผ่าน manifest
 * ไม่โผล่เป็น <link> ในเอกสารอยู่แล้ว ตัวที่เจอจึงเป็นของ reg เท่านั้น
 */
export function captureRegistrarStyles(doc = document) {
  captured = [...doc.querySelectorAll("link[rel='stylesheet'], link[type='text/css']")];
  return captured.length;
}

/** เปิด/ปิด stylesheet ชุดที่จำไว้ ; ปลอดภัยแม้ยังไม่เคย capture */
export function setRegistrarStylesEnabled(enabled) {
  for (const link of captured) {
    link.disabled = !enabled;
  }
}
