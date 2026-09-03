// โหลด fixture ผ่านเส้นทางเดียวกับที่ extension ใช้จริง
//
//   fetch -> arrayBuffer -> TextDecoder("windows-874") -> DOMParser
//
// ตรงกับ fetchDocument ใน services/reg.js ทุกขั้น ถ้าลัดขั้นไหน
// สิ่งที่ preview ทดสอบก็ไม่ใช่สิ่งที่ extension ทำ
//
// fixture อยู่ใต้ e2e/harness/public/ เท่านั้น : ไฟล์ .html ที่อื่นใน root ของ vite
// จะถูก HTML pipeline อ่านเป็น UTF-8 แล้วเสิร์ฟใหม่ ไทยกลายเป็น U+FFFD ทั้งหน้า

const REGISTRAR_ENCODING = "windows-874";
const FIXTURE_BASE = "/fixtures";

// stylesheet ของ reg เอง : ต้องโหลดใน harness ด้วย ไม่งั้นการชนกันระหว่าง
// กฎ element ของ reg (unlayered) กับ utility ของ tailwind (@layer) จะมองไม่เห็น
export const REGISTRAR_CSS = `${FIXTURE_BASE}/registrar.css`;

export function loadRegistrarStylesheet(doc = document) {
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = REGISTRAR_CSS;
  doc.head.appendChild(link);
  return link;
}

export const FIXTURES = {
  studyMega: "study-table-mega.html",
  studyEmpty: "study-table-empty.html",
  // ภาคเรียนจริงหน้าหนึ่ง : จ. _ พ. พฤ. ศ. เวลา 09:00-18:00
  // มีวันว่างกลางสัปดาห์ ไม่มีคาบ 08:00 ไม่มีเสาร์อาทิตย์ — เคสของ export ที่ตัดตามเนื้อหา
  studyTypical: "study-table-typical.html",
  examMega: "exam-mega.html",
  // หน้าเลือกเทอมของ reg ตัวจริง ไม่ต้อง redact : ไม่มีข้อมูลนักศึกษาอยู่ในนั้นเลย
  // (ตรวจแล้ว — มีแต่ตัวเลือกปี/ภาคเรียน ปุ่ม และข้อความไทยของหน้า)
  termSelector: "term-selector.html",
};

/**
 * คืนทั้ง document ที่ parse แล้วและ HTML ดิบของ body
 * (ตัวหลังใช้เป็น oldTable/oldDesign ให้ปุ่ม "แบบเดิม" มีของจริงให้แสดง)
 */
export async function loadFixture(name) {
  const response = await fetch(`${FIXTURE_BASE}/${name}`);
  if (!response.ok) {
    throw new Error(`โหลด fixture ${name} ไม่ได้ (status ${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const html = new TextDecoder(REGISTRAR_ENCODING).decode(buffer);

  // ยาม : byte ที่ถูกแปลงระหว่างทางจะมี U+FFFD โผล่ ต้องดังตรงนี้
  // ไม่ใช่ปล่อยให้ไปโผล่เป็น "scrape ไม่ได้" ปลายทาง
  const mangled = (html.match(/�/g) ?? []).length;
  if (mangled > 0) {
    throw new Error(
      `fixture ${name} ถูกแปลง encoding ระหว่างทาง (พบ U+FFFD ${mangled} ตัว) — ` +
        "ไฟล์ต้องอยู่ใต้ e2e/harness/public/ ถึงจะถูกเสิร์ฟดิบ",
    );
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return { doc, bodyHtml: doc.body.innerHTML };
}

// เซลล์เทอมของหัวตาราง — ต้องเป็น td ชั้นในสุด : หน้า reg เอาตารางข้อมูลซ้อนไว้ใน td
// ของตารางนอก ซึ่ง textContent ของมันก็มีคำว่า "ปีการศึกษา" ด้วย จับผิดใบทีเดียวตารางหายทั้งหน้า
function termCell(doc) {
  return [...doc.querySelectorAll("td")].find(
    (cell) =>
      cell.textContent.includes("ปีการศึกษา") &&
      cell.querySelector("table, td") === null,
  );
}

// ลบข้อความในเซลล์เทอมของหัวตาราง เพื่อจำลองหน้าที่ scraper อ่านเทอมไม่ออก
// (?header=broken — ใช้ทั้งตอน mount ใน main.js และตอน fetch ใน regStub.js)
export function breakTermCell(doc) {
  const cell = termCell(doc);
  if (cell) {
    cell.textContent = "";
  }
  return doc;
}

// เขียนเทอมในหัวตารางใหม่ ใช้จำลอง "เปิดหน้ามาบนภาคฤดูร้อน" ซึ่ง fixture ที่ commit
// ไว้ไม่มี (corpus มีของจริงแต่ gitignore) — คั่นด้วย &nbsp; ห้าตัวเหมือนที่ reg เขียน
export function rewriteTermCell(doc, semester, year) {
  const cell = termCell(doc);
  if (cell) {
    cell.innerHTML =
      `<strong>ประจำภาคเรียนที่</strong>&nbsp;${semester}` +
      `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>ปีการศึกษา</strong>&nbsp;${year}`;
  }
  return doc;
}
