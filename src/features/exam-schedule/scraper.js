import { compareAsc, set } from "date-fns";
import { monthNumberOf } from "../../shared/dateNames";

// ตารางสอบอยู่ใน table ซ้อน table ของหน้า reg — index ล้วน ๆ ตามหน้าเว็บจริง
const EXAM_TABLE_BODY =
  "body > center > form > table > tbody > tr:nth-child(5) > td > table > tbody";
// แถววิชาเริ่มที่ tr ที่ 17 และเว้นแถวคั่นทีละ 1 (จึงเดินทีละ 2)
const FIRST_SUBJECT_ROW = 17;
const SUBJECT_ROW_STEP = 2;

// Verified on the live page: short years are GREGORIAN ("พ. 8 พ.ย. 23" = 2023 CE)
// despite Thai month names. Full years >= 2400 would be Buddhist era.
export const gregorianYear = (raw) => {
  const year = Number(raw);
  if (year < 100) return 2000 + year;
  if (year >= 2400) return year - 543;
  return year;
};

// รับได้ทั้ง document จริงและ element ที่มาจาก DOMParser
// (selector ของหน้านี้อ้างจาก body จึงต้องหา document เจ้าของก่อน)
function documentOf(root) {
  return root.ownerDocument ?? root;
}

// ช่องข้อมูลของแต่ละแถวอยู่ที่ลูกลำดับคู่ (ลำดับคี่คือเส้นคั่น)
function cellTexts(row) {
  const texts = [];
  for (let index = 0; index < row.children.length; index += 2) {
    texts.push(row.children[index].textContent);
  }
  return texts;
}

// "พ. 8 พ.ย. 23" -> Date ; "จัดสอบเอง" หรือช่องว่าง -> null
function parseExamDate(text) {
  const parts = String(text ?? "").split(" ");
  if (parts.length <= 1) {
    return null;
  }
  return new Date(
    gregorianYear(parts[3]),
    monthNumberOf(parts[2]) - 1,
    Number(parts[1]),
  );
}

// "09:00-12:00 น." -> [Date, Date] ; ไม่มีเวลา/ไม่มีวันสอบ -> [null, null]
function parseExamTime(text, date) {
  const parts = String(text ?? "")
    .replace("น.", "")
    .trim()
    .split("-")
    .map((part) => part.split(":"));
  if (parts.length != 2 || !date) {
    return [null, null];
  }
  return [
    set(date, {
      hours: parseInt(parts[0][0]),
      minutes: parseInt(parts[0][1]),
    }),
    set(date, {
      hours: parseInt(parts[1][0]),
      minutes: parseInt(parts[1][1]),
    }),
  ];
}

function scrapeSubjects(doc) {
  const subjects = [];
  let rowIndex = FIRST_SUBJECT_ROW;
  while (true) {
    const row = doc.querySelector(
      `${EXAM_TABLE_BODY} > tr:nth-child(${rowIndex})`,
    );
    if (!row) {
      break;
    }
    rowIndex += SUBJECT_ROW_STEP;
    const cells = cellTexts(row);
    // วิชาเดียวกันถูกแตกเป็นหลายแถวตามประเภทการสอบ -> รวมประเภทด้วย "/"
    const existing = subjects.find((subject) => subject.order === cells[0]);
    if (existing) {
      existing.examType =
        existing.examType + (cells[5] ? `/${String(cells[5]).trim()}` : "");
      continue;
    }
    const date = parseExamDate(cells[6]);
    const [startTime, endTime] = parseExamTime(cells[7], date);
    subjects.push({
      order: cells[0] ? cells[0] : "",
      subjectCode: cells[1] ? cells[1] : "",
      subjectName: cells[2] ? cells[2] : "",
      sec: cells[3] ? cells[3] : "",
      credit: cells[4] ? cells[4] : "",
      examType: cells[5] ? String(cells[5]).trim() : "",
      startTime,
      endTime,
      date,
      room: cells[8] ? cells[8] : "",
    });
  }
  return subjects;
}

// วิชาที่ไม่มีเวลาสอบไปอยู่ท้ายสุด
function sortByStartTime(subjects) {
  return subjects.sort((a, b) => {
    if (a.startTime && b.startTime) return compareAsc(a.startTime, b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });
}

function groupByDate(subjects) {
  const grouped = [];
  subjects.forEach((subject) => {
    const existing = grouped.find(
      (group) => group.date?.getTime() === subject.date?.getTime(),
    );
    if (existing) {
      existing.subject.push(subject);
    } else {
      grouped.push({ date: subject.date, subject: [subject] });
    }
  });
  return grouped;
}

function scrapeHeader(doc) {
  const textOf = (selector) => doc.querySelector(selector)?.textContent ?? "";
  const valueOf = (selector) => doc.querySelector(selector)?.value ?? "";
  return {
    term: valueOf("#mid_or_final"),
    faculty: textOf(`${EXAM_TABLE_BODY} > tr:nth-child(4) > td > strong`),
    departmentAndProgramme: textOf(`${EXAM_TABLE_BODY} > tr:nth-child(6) > td`),
    semesterAndYear: textOf(`${EXAM_TABLE_BODY} > tr:nth-child(8) > td`),
    studentInfo: textOf(`${EXAM_TABLE_BODY} > tr:nth-child(10) > td`),
    year: valueOf("#year"),
    semester: valueOf("#semester"),
    studentId: valueOf("#student_id"),
  };
}

/**
 * scrape หน้าตารางสอบทั้งหน้า
 * คืน { schedule: [{ date, subject: [...] }], data: {...} }
 * หรือ null เมื่อหน้าเว็บไม่มีโครงสร้างตารางสอบ (เพื่อให้ boot คงหน้าเดิมไว้)
 */
export function scrapeExamPage(root) {
  if (!root) {
    return null;
  }
  const doc = documentOf(root);
  if (!doc?.querySelector(EXAM_TABLE_BODY)) {
    return null;
  }
  return {
    schedule: groupByDate(sortByStartTime(scrapeSubjects(doc))),
    data: scrapeHeader(doc),
  };
}
