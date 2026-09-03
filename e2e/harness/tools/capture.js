// เก็บ corpus : วนดึงหน้า reg ของทุกเทอมที่บัญชีนี้มี แล้วโหลดออกมาเป็น JSON ก้อนเดียว
//
// วิธีใช้ :
//   1. ล็อกอิน reg แล้วเปิด https://www.reg.kmitl.ac.th/u_student/report_studytable.php
//   2. เปิด DevTools -> Console -> วางไฟล์นี้ทั้งไฟล์ -> Enter
//   3. รอจนขึ้น "เสร็จ" แล้วจะมีไฟล์ kmitl-corpus-<timestamp>.json โหลดลงมา
//   4. เอาไฟล์นั้นไปแตกด้วย `node e2e/harness/tools/corpus.mjs <ไฟล์>` (task 2.3)
//
// ไฟล์นี้ไม่ได้ถูก import ที่ไหน และไม่ได้ถูก bundle เข้า extension — เป็นสคริปต์วางมือ
//
// สิ่งที่ต้องระวัง :
// - เก็บเป็น byte ดิบ (base64) ไม่ decode ตรงนี้ เพราะหน้า reg เป็น windows-874
//   ถ้าปล่อยให้ browser decode เป็น UTF-8 ตั้งแต่ตอนเก็บ ภาษาไทยจะเพี้ยนติดไปในไฟล์
// - JSON ที่ได้ "ยังไม่ redact" มีรหัส/ชื่อจริง ห้าม commit (e2e/harness/public/corpus/ ถูก gitignore ไว้แล้ว)
// - ยิงทีละ request พร้อมหน่วงเวลา : reg เป็นระบบเก่า ไม่ควรยิงขนาน 40 request รวดเดียว

/* eslint-env browser */

(async () => {
  // path แบบ relative เหมือน services/reg.js — ใช้ได้ทั้งโดเมน www. และ new.
  const TERM_SELECTOR_PAGE = "report_studytable.php";
  const STUDY_TABLE_PAGE = "report_studytable_show.php";
  const EXAM_TABLE_PAGE = "report_examtable_show.php";
  const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded" };

  // 3 = ภาคฤดูร้อน เก็บไว้ด้วย เทอมที่ไม่ได้ลงทะเบียนจะได้หน้าเปล่า
  // ซึ่งเป็นวัตถุดิบของ fixture `study-table-empty` พอดี
  const SEMESTERS = ["1", "2", "3"];
  const EXAM_TERMS = ["M", "F"];
  const DELAY_MS = 400;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ArrayBuffer -> base64 ทีละก้อน กัน stack ล้นเวลา apply argument เยอะ ๆ
  function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(index, index + 0x8000),
      );
    }
    return btoa(binary);
  }

  const pages = [];
  let failed = 0;

  async function grab(key, url, options) {
    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
      });
      const buffer = await response.arrayBuffer();
      pages.push({
        ...key,
        url,
        status: response.status,
        bytes: buffer.byteLength,
        base64: toBase64(buffer),
      });
      const mark = response.ok && buffer.byteLength > 0 ? "ok" : "ว่าง/ผิดพลาด";
      console.log(`[${mark}] ${JSON.stringify(key)} ${buffer.byteLength} bytes`);
      if (!response.ok) failed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[พัง] ${JSON.stringify(key)}`, error);
      pages.push({ ...key, url, status: 0, bytes: 0, base64: null });
    }
    await sleep(DELAY_MS);
  }

  const studyBody = (year, semester) =>
    new URLSearchParams({ command: "", year, semester }).toString();

  // student_id ส่งค่าว่างเหมือนที่หน้า reg ส่งเอง — server ใช้ session อยู่แล้ว
  // (ดู ExamHeader.svelte ; ถ้าส่งรหัสจริงอาจไปเจอ code path คนละเส้น)
  const examBody = (year, semester, term) =>
    new URLSearchParams({
      year,
      semester,
      student_id: "",
      mid_or_final: term,
    }).toString();

  const post = (body) => ({ method: "POST", headers: FORM_HEADERS, body });

  // --- 1. หน้าเลือกเทอม : เก็บไว้ด้วยเพราะ fetchTermOptions() parse หน้านี้
  console.log("กำลังดึงหน้าเลือกเทอม...");
  await grab({ page: "term-selector" }, TERM_SELECTOR_PAGE);

  // --- 2. อ่านปีจาก select#year ของหน้านั้น (decode เฉพาะตรงนี้ ไม่กระทบ byte ที่เก็บไว้)
  const selectorEntry = pages[0];
  if (!selectorEntry?.base64) {
    console.error("ดึงหน้าเลือกเทอมไม่สำเร็จ — ล็อกอินอยู่จริงไหม? หยุด");
    return;
  }
  const selectorHtml = new TextDecoder("windows-874").decode(
    Uint8Array.from(atob(selectorEntry.base64), (char) => char.charCodeAt(0)),
  );
  const selectorDoc = new DOMParser().parseFromString(
    selectorHtml,
    "text/html",
  );
  const years = [
    ...new Set(
      [...(selectorDoc.querySelectorAll("#year option") ?? [])]
        .map((option) => option.value.trim())
        .filter((value) => value !== ""),
    ),
  ];

  if (years.length === 0) {
    console.error(
      "ไม่พบปีใน select#year — หน้าอาจเปลี่ยนโครงสร้าง หรือ session หมดอายุ หยุด",
    );
    return;
  }
  console.log(`พบ ${years.length} ปี :`, years.join(", "));
  console.log(
    `จะดึงทั้งหมด ${years.length * SEMESTERS.length * (1 + EXAM_TERMS.length)} หน้า`,
  );

  // --- 3. วนทุก (ปี, ภาคเรียน) : ตารางเรียน 1 หน้า + ตารางสอบ 2 รอบ
  for (const year of years) {
    for (const semester of SEMESTERS) {
      await grab(
        { page: "study-table", year, semester },
        STUDY_TABLE_PAGE,
        post(studyBody(year, semester)),
      );
      for (const term of EXAM_TERMS) {
        await grab(
          { page: "exam-table", year, semester, term },
          EXAM_TABLE_PAGE,
          post(examBody(year, semester, term)),
        );
      }
    }
  }

  // --- 4. โหลดออกมาเป็นไฟล์เดียว
  const payload = {
    capturedAt: new Date().toISOString(),
    origin: location.origin,
    years,
    semesters: SEMESTERS,
    examTerms: EXAM_TERMS,
    pages,
  };
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kmitl-corpus-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  const empty = pages.filter((entry) => entry.bytes === 0).length;
  console.log(
    `เสร็จ : ${pages.length} หน้า (พัง ${failed}, ว่าง ${empty}) -> ${anchor.download}`,
  );
  console.log("อย่าลืม : ไฟล์นี้ยังไม่ redact ห้าม commit");
})();
