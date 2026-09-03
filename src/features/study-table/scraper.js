import * as R from "remeda";

import { dayIndexOf } from "../../shared/dateNames";

function textAt(nodes, index) {
  return nodes[index]?.textContent?.trim() ?? "";
}

// ข้อมูลในหัวตารางถูกคั่นด้วยช่องว่างหลายตัว เช่น "คณะ...   สาขา..."
//
// ห้ามแยกด้วยจำนวนช่องว่างที่ตายตัว : reg คั่นคอลัมน์ด้วย &nbsp; (U+00A0) 3 หรือ 5 ตัว
// ส่วน label กับค่าของมันคั่นด้วยตัวเดียวเสมอ (นับจาก corpus ทั้ง 12 หน้า)
// การ split("   ") แบบเดิมจึงไม่เคยแมตช์เลย ทำให้ year/major/studentName ว่างทุกหน้า
// \s ของ JS ครอบ U+00A0 อยู่แล้ว {2,} จึงกินได้ทั้งแบบ nbsp และช่องว่างธรรมดา
function splitColumns(text) {
  return R.pipe(
    text.split(/\s{2,}/),
    R.map((column) => column.trim()),
    R.filter((column) => column !== ""),
  );
}

// หน้าที่ไม่มีข้อมูล (เช่น ภาคเรียนที่ไม่ได้ลงทะเบียน หรือ session หมดอายุ)
// จะไม่มี tbody ของหัวตาราง จึงคืน null แทนการ throw
export function getinfo(studyTable) {
  if (!studyTable) {
    return null;
  }
  const table = studyTable.querySelectorAll("tbody")[1];
  if (!table) {
    return null;
  }
  const nodes = [...table.childNodes];
  const facultyName = textAt(nodes, 6);
  if (facultyName === "") {
    return null;
  }
  const departmentSubject = splitColumns(textAt(nodes, 10));
  const departmentTerm = splitColumns(textAt(nodes, 14));
  const studentName = splitColumns(textAt(nodes, 18));
  return {
    facultyName,
    department: departmentSubject[0] ?? "",
    major: departmentSubject[1] ?? "",
    semester: departmentTerm[0] ?? "",
    year: departmentTerm[1] ?? "",
    studentId: studentName[0] ?? "",
    studentName: studentName[1] ?? "",
  };
}

// แปลงชื่อวันเป็นเลข (0 = จันทร์) ตั้งแต่ขา parse — downstream ไม่ต้องรู้จัก
// ทั้งชื่อไทยและอังกฤษอีก (วันที่ไม่รู้จักได้ -1 และจะเรียงไว้หน้าสุด)
function parsePeriod(text) {
  const splitData = R.filter(text.trim().split(" "), (part) => part !== "");
  const time = splitData[1]?.split("-") ?? [];
  if (!time[0] || !time[1]) {
    return null;
  }
  return {
    dayIndex: dayIndexOf(splitData[0]),
    start: time[0],
    end: time[1],
  };
}

function childTexts(node) {
  return R.map([...node.childNodes], (child) => child.textContent);
}

function parsePeriods(texts) {
  return R.pipe(texts, R.map(parsePeriod), R.filter(R.isNonNull));
}

export function scrapeTable(studyTable) {
  if (!studyTable) {
    return [];
  }
  const scrapedData = R.pipe(
    [...studyTable.querySelectorAll("tr")],
    R.filter((row) => row.childNodes.length == 37),
    R.drop(1),
    R.map((row) => {
      const periodTexts = childTexts(row.childNodes[25]);
      const [lectureTexts, rest] = R.partition(
        periodTexts,
        (text) => text.includes("ท") || text.includes("L"),
      );
      const labTexts = R.filter(
        rest,
        (text) => text.includes("ป") || text.includes("P"),
      );

      const room = R.filter(childTexts(row.childNodes[29]), (text) => text != "");
      const building = R.filter(childTexts(row.childNodes[33]), (text) => text != "");

      return {
        subjectId: row.childNodes[5].textContent,
        subjectName: row.childNodes[9].textContent,
        subjectDescription: row.childNodes[35].textContent,
        subjectCredits: row.childNodes[13].textContent,
        subjectLecture: {
          sec: row.childNodes[17].textContent,
          period: parsePeriods(lectureTexts),
          room: room[0],
          building: building[0],
        },
        subjectLab: {
          sec: row.childNodes[21].textContent,
          period: parsePeriods(labTexts),
          room: room[1],
          building: building[1],
        },
      };
    }),
  );
  return scrapedData;
}

export function flattenStudyTable(data) {
  if (!data) {
    return [];
  }
  return R.flatMap(data, (item) => {
    const {
      subjectId,
      subjectName,
      subjectCredits,
      subjectLecture,
      subjectLab,
      subjectDescription,
    } = item;
    const expand = (subject, type) =>
      subject.sec != ""
        ? R.map(subject.period, ({ dayIndex, start, end }) => ({
            subjectId,
            subjectName,
            subjectCredits,
            subjectDescription,
            sec: subject.sec,
            room: subject.room,
            building: subject.building,
            type,
            dayIndex,
            start,
            end,
          }))
        : [];
    return [...expand(subjectLecture, "ท"), ...expand(subjectLab, "ป")];
  });
}

export function sortByDay(data) {
  if (!data) {
    return [];
  }
  return R.sortBy(
    data,
    (item) => item.dayIndex,
    (item) => item.start,
  );
}

/**
 * แปลง info ที่ scrape ได้ (อาจเป็น null) ให้เป็นหัวตารางที่ component ใช้ได้ทันที
 * ฟิลด์ที่หน้าเว็บไม่มี จะกลายเป็นค่าว่าง ไม่ใช่ error
 */
export function toHeader(info) {
  return {
    faculty: info?.facultyName ?? "",
    department: info?.department ?? "",
    major: info?.major ?? "",
    semester: info?.semester ?? "",
    year: info?.year ?? "",
    studentId: info?.studentId ?? "",
    studentName: info?.studentName ?? "",
  };
}

/**
 * scrape หน้าตารางเรียนทั้งหน้า ใช้ได้ทั้งกับ document จริงและ document ที่ได้จาก DOMParser
 *
 * หน้าที่ข้อมูลไม่ครบจะได้ info เป็น null / ตารางว่าง แต่ต้องไม่คืน null
 * เพราะ component มี empty state ให้อยู่แล้ว (ห้ามปล่อยให้เป็นหน้าเปล่า)
 */
export function scrapeStudyTablePage(root) {
  if (!root) {
    return null;
  }
  const table = root.querySelector("table");
  return {
    info: getinfo(table),
    schedule: sortByDay(flattenStudyTable(scrapeTable(table))),
  };
}
