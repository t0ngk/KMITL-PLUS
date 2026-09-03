import * as R from "remeda";

// หน้าเว็บของ reg ยังส่งข้อมูลเป็น windows-874 (TIS-620) อยู่
// ถ้าใช้ response.text() ตรง ๆ ภาษาไทยจะเพี้ยน
const REGISTRAR_ENCODING = "windows-874";

// URL แบบ relative เพราะ content script รันอยู่บน path เดียวกัน (/u_student/)
// ทำให้ใช้ได้ทั้งโดเมน www. และ new.
const TERM_SELECTOR_PAGE = "report_studytable.php";
const STUDY_TABLE_PAGE = "report_studytable_show.php";
const EXAM_TABLE_PAGE = "report_examtable_show.php";

const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded" };

async function fetchDocument(url, options) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (!response.ok) {
    throw new Error(`${url} ตอบกลับด้วย status ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const html = new TextDecoder(REGISTRAR_ENCODING).decode(buffer);
  return new DOMParser().parseFromString(html, "text/html");
}

function optionValues(select) {
  if (!select) {
    return [];
  }
  return R.pipe(
    [...select.querySelectorAll("option")],
    R.map((option) => option.value.trim()),
    R.filter((value) => value !== ""),
    R.unique(),
  );
}

/**
 * อ่านตัวเลือกปีการศึกษาและภาคเรียนออกจากหน้าเลือกเทอมของ reg
 * คืน { years, semesters } เป็น array ของ string เรียงตามที่ server ส่งมา
 *
 * ไม่มีรายการสำรองโดยตั้งใจ : เสนอเท่าที่ reg เสนอเท่านั้น ลิสต์ที่เราคิดขึ้นเอง
 * คือการอ้างว่ามีเทอมที่ไม่มีหลักฐานว่ามีอยู่ ถ้าอ่านไม่ได้ผู้เรียกควรซ่อน picker
 * (แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพื่อให้ preview stub เรียกตัวเดียวกันนี้ได้)
 */
export function readTermOptions(page) {
  return {
    years: optionValues(page.querySelector("#year")),
    semesters: optionValues(page.querySelector("#semester")),
  };
}

export async function fetchTermOptions() {
  return readTermOptions(await fetchDocument(TERM_SELECTOR_PAGE));
}

/**
 * ขอตารางเรียนของปี/ภาคเรียนที่เลือก แล้วคืนเป็น Document ที่ parse แล้ว
 * พร้อมส่งต่อให้ getinfo/scrapeTable ได้ทันที
 */
export async function fetchStudyTable(year, semester) {
  const body = new URLSearchParams({
    command: "",
    year: `${year}`,
    semester: `${semester}`,
  });
  return fetchDocument(STUDY_TABLE_PAGE, {
    method: "POST",
    headers: FORM_HEADERS,
    body: body.toString(),
  });
}

/**
 * ขอตารางสอบของปี/ภาคเรียน/รอบสอบที่เลือก (M = กลางภาค, F = ปลายภาค)
 * ส่งฟิลด์ชุดเดียวกับที่ <form> ใน ExamHeader เขียนไว้ รวมทั้ง student_id ที่ว่าง
 */
export async function fetchExamTable(year, semester, studentId, midOrFinal) {
  const body = new URLSearchParams({
    year: `${year}`,
    semester: `${semester}`,
    student_id: `${studentId}`,
    mid_or_final: `${midOrFinal}`,
  });
  return fetchDocument(EXAM_TABLE_PAGE, {
    method: "POST",
    headers: FORM_HEADERS,
    body: body.toString(),
  });
}
