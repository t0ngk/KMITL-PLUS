// harness เท่านั้น : รัน scraper ตัวจริงทับทุกไฟล์ใน public/corpus/
// แล้วสรุปผลออกมาเป็นตารางให้ดูด้วยตา (openspec preview-harness-fixtures task 2.4)
//
// เปิดที่ http://localhost:<port>/sweep.html หลังแตก corpus ด้วย tools/corpus.mjs แล้ว
//
// จุดสำคัญ : path เข้า scraper ต้องเหมือน services/reg.js ทุกขั้น
// arrayBuffer -> TextDecoder("windows-874") -> DOMParser -> scrape
// ถ้าลัดขั้นไหน สิ่งที่ทดสอบก็ไม่ใช่สิ่งที่ extension ทำจริง
//
// corpus ต้องอยู่ใน public/ และอ่านผ่าน manifest ห้ามใช้ import.meta.glob :
// ไฟล์ .html นอก public/ โดน HTML pipeline ของ vite อ่านเป็น UTF-8 แล้วเสิร์ฟใหม่
// ไทยกลายเป็น U+FFFD ทั้งหน้า (วัดแล้ว 14764 -> 15300 bytes, U+FFFD 71 ตัว)
// ถ้า sweep อ่านของที่ผ่าน transform ผลจะออกมาเป็น "scrape ไม่ได้" ทั้ง ๆ ที่ scraper ปกติ

import { scrapeExamPage } from "../../src/features/exam-schedule/scraper";
import { scrapeStudyTablePage } from "../../src/features/study-table/scraper";

const REGISTRAR_ENCODING = "windows-874";

// กวาดทั้ง corpus (ของจริง ไม่ commit) และ fixtures (สังเคราะห์ commit ได้)
// fixtures ต้องผ่านเกณฑ์เดียวกับของจริง ไม่งั้นก็ไม่ใช่ตัวแทนที่เชื่อได้
const SOURCES = ["/corpus", "/fixtures"];

const files = {};
for (const base of SOURCES) {
  const response = await fetch(`${base}/manifest.json`);
  if (!response.ok) {
    console.warn(`ข้าม ${base} — ยังไม่มี manifest.json`);
    continue;
  }
  const manifest = await response.json();
  for (const name of manifest.files) {
    files[`${base.slice(1)}/${name}`] = `${base}/${name}`;
  }
}

async function documentOf(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const html = new TextDecoder(REGISTRAR_ENCODING).decode(buffer);
  // ยาม : ถ้า byte ถูกแปลงระหว่างทาง (เช่นหลุดออกนอก public/) จะมี U+FFFD โผล่มา
  // ต้องจับตรงนี้ ไม่งั้นผล scrape จะออกมาเป็น 0 แล้วเข้าใจผิดว่า scraper พัง
  const mangled = (html.match(/�/g) ?? []).length;
  return {
    doc: new DOMParser().parseFromString(html, "text/html"),
    bytes: buffer.byteLength,
    mangled,
  };
}

function studySummary(scraped) {
  if (!scraped) {
    return { note: "คืน null" };
  }
  const { info, schedule } = scraped;
  const unknownDays = schedule.filter((item) => item.dayIndex === -1).length;
  const starts = schedule.map((item) => item.start).sort();
  const ends = schedule.map((item) => item.end).sort();
  return {
    info: info ? "มี" : "null",
    subjects: schedule.length,
    days: new Set(schedule.map((item) => item.dayIndex)).size,
    unknownDay: unknownDays,
    earliest: starts[0] ?? "-",
    latest: ends[ends.length - 1] ?? "-",
    lecture: schedule.filter((item) => item.type === "ท").length,
    lab: schedule.filter((item) => item.type === "ป").length,
  };
}

function examSummary(scraped) {
  if (!scraped) {
    return { note: "คืน null" };
  }
  const { schedule, data } = scraped;
  const subjects = schedule.flatMap((group) => group.subject);
  return {
    term: data.term || "-",
    groups: schedule.length,
    subjects: subjects.length,
    noDate: schedule.filter((group) => !group.date).length,
    noTime: subjects.filter((item) => !item.startTime).length,
    mergedType: subjects.filter((item) => String(item.examType).includes("/"))
      .length,
    rowspanGroups: schedule.filter((group) => group.subject.length > 1).length,
  };
}

// เก็บ schedule ดิบไว้คิด coverage ทีหลัง (task 2.5 : corpus ขาดเคสไหนบ้าง)
const allStudy = [];
const allExamSubjects = [];

const rows = [];

for (const [key, url] of Object.entries(files).sort()) {
  const [source, name] = [key.split("/")[0], key.split("/").slice(1).join("/")];
  const kind = name.startsWith("exam")
    ? "exam"
    : name.startsWith("study")
      ? "study"
      : "other";

  if (kind === "other") {
    // หน้าเลือกเทอม : ไม่มี scraper ของตัวเอง เช็คแค่ว่า select#year ยังอ่านได้
    const { doc, bytes, mangled } = await documentOf(url);
    const years = [...doc.querySelectorAll("#year option")]
      .map((option) => option.value.trim())
      .filter((value) => value !== "");
    rows.push({
      source,
      file: name,
      kind,
      ok: years.length > 0 && mangled === 0,
      bytes,
      mangled,
      years: years.join(","),
    });
    continue;
  }

  try {
    const { doc, bytes, mangled } = await documentOf(url);
    const scraped =
      kind === "study" ? scrapeStudyTablePage(doc) : scrapeExamPage(doc);
    if (kind === "study" && scraped) {
      allStudy.push({ source, file: name, schedule: scraped.schedule });
    }
    if (kind === "exam" && scraped) {
      allExamSubjects.push(
        ...scraped.schedule.flatMap((g) => g.subject).map((s) => ({ ...s, source })),
      );
    }
    const summary =
      kind === "study" ? studySummary(scraped) : examSummary(scraped);
    rows.push({ source, file: name, kind, ok: mangled === 0, bytes, mangled, ...summary });
  } catch (error) {
    rows.push({ source, file: name, kind, ok: false, error: String(error) });
    console.error(`[พัง] ${name}`, error);
  }
}

const threw = rows.filter((row) => row.ok === false);
const study = rows.filter((row) => row.kind === "study");
const exam = rows.filter((row) => row.kind === "exam");
const emptyStudy = study.filter((row) => row.subjects === 0);
const emptyExam = exam.filter((row) => row.subjects === 0);

console.table(rows);
const verdict = {
  files: rows.length,
  threw: threw.length,
  mangled: rows.filter((row) => (row.mangled ?? 0) > 0).length,
  studyPages: study.length,
  studyEmpty: emptyStudy.length,
  examPages: exam.length,
  examEmpty: emptyExam.length,
  examNoDate: exam.reduce((sum, row) => sum + (row.noDate ?? 0), 0),
  examNoTime: exam.reduce((sum, row) => sum + (row.noTime ?? 0), 0),
  examMergedType: exam.reduce((sum, row) => sum + (row.mergedType ?? 0), 0),
  studyUnknownDay: study.reduce((sum, row) => sum + (row.unknownDay ?? 0), 0),
};
console.log("SWEEP_VERDICT " + JSON.stringify(verdict));

// --- coverage : เคสที่ spec ต้องการ มีให้ครบไหม
// แยกตาม source : corpus บอกว่า "ของจริงมีอะไร" (task 2.5)
// fixtures บอกว่า "ไฟล์ที่ commit ครอบคลุมครบไหม" (task 3.3)
const minutesOf = (time) => {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
};

function coverageOf(source) {
  const pages = allStudy.filter((entry) => entry.source === source);
  const subjects = pages.flatMap((entry) => entry.schedule);
  const durations = subjects.map((s) => minutesOf(s.end) - minutesOf(s.start));
  const exams = allExamSubjects.filter((s) => s.source === source);

  // วิชาซ้อนเวลาในวันเดียวกันของหน้าเดียวกัน = ตัวที่ทำให้เกิด last-writer-wins
  let overlapPages = 0;
  for (const entry of pages) {
    const byDay = {};
    for (const item of entry.schedule) (byDay[item.dayIndex] ??= []).push(item);
    const overlaps = Object.values(byDay).some((list) =>
      list.some((a, i) =>
        list.some(
          (b, j) =>
            i < j &&
            minutesOf(a.start) < minutesOf(b.end) &&
            minutesOf(b.start) < minutesOf(a.end),
        ),
      ),
    );
    if (overlaps) overlapPages += 1;
  }

  return {
    studySubjects: subjects.length,
    earliestStart: subjects.map((s) => s.start).sort()[0] ?? "-",
    latestEnd: subjects.map((s) => s.end).sort().pop() ?? "-",
    startsAt0800: subjects.filter((s) => s.start === "08:00").length,
    endsAt2000: subjects.filter((s) => s.end === "20:00").length,
    shortestMinutes: durations.length ? Math.min(...durations) : null,
    blocks15min: durations.filter((d) => d === 15).length,
    saturday: subjects.filter((s) => s.dayIndex === 5).length,
    englishDayLecture: subjects.filter(
      (s) => s.type === "ท" && s.subjectName.includes("ENGLISH DAY"),
    ).length,
    englishDayPractice: subjects.filter(
      (s) => s.type === "ป" && s.subjectName.includes("ENGLISH DAY"),
    ).length,
    unknownDay: subjects.filter((s) => s.dayIndex === -1).length,
    daysSeen: [...new Set(subjects.map((s) => s.dayIndex))].sort((a, b) => a - b).join(","),
    overlapPages,
    emptyRoom: subjects.filter((s) => !s.room).length,
    emptyBuilding: subjects.filter((s) => !s.building).length,
    examSubjects: exams.length,
    examSelfArranged: exams.filter((s) => !s.date).length,
    examNoTime: exams.filter((s) => !s.startTime).length,
    examMergedType: exams.filter((s) => String(s.examType).includes("/")).length,
  };
}

const coverage = { corpus: coverageOf("corpus"), fixtures: coverageOf("fixtures") };
console.log("SWEEP_COVERAGE " + JSON.stringify(coverage));

// fixtures ต้องครอบคลุมทุกเคสที่ spec พูดถึง ไม่งั้นก็ไม่มีประโยชน์ที่จะ commit
const f = coverage.fixtures;
const gaps = Object.entries({
  "08:00 ชนขอบซ้าย": f.startsAt0800 > 0,
  "20:00 ชนขอบขวา": f.endsAt2000 > 0,
  "คาบ 15 นาที": f.blocks15min > 0,
  "วันเสาร์": f.saturday > 0,
  "วันไม่รู้จัก (-1)": f.unknownDay > 0,
  "ชื่อวันอังกฤษ (บรรยาย)": f.englishDayLecture > 0,
  "ชื่อวันอังกฤษ (ปฏิบัติ)": f.englishDayPractice > 0,
  "วิชาซ้อนเวลา": f.overlapPages > 0,
  "ห้องว่าง": f.emptyRoom > 0,
  "เทอมว่าง (empty state)": rows.some(
    (r) => r.source === "fixtures" && r.kind === "study" && r.subjects === 0,
  ),
  "จัดสอบเอง": f.examSelfArranged > 0,
  "ไม่มีเวลาสอบ": f.examNoTime > 0,
  "ประเภทสอบรวม A/B": f.examMergedType > 0,
})
  .filter(([, ok]) => !ok)
  .map(([label]) => label);
console.log("SWEEP_FIXTURE_GAPS " + JSON.stringify(gaps));

// แสดงบนหน้าด้วย เพราะ convention ของโปรเจกต์คือ "ตรวจด้วยการดู"
const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
document.body.innerHTML = `
  <!-- หน้า debug ล้วน ไม่ใช่ product surface : จงใจไม่ใช้ token จาก DESIGN.md
       และไม่ประกาศสีเป็นค่าคงที่ ใช้ currentColor กับสีระบบพอ -->
  <style>
    body { font: 13px/1.5 ui-monospace, monospace; margin: 24px; }
    table { border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid; padding: 4px 8px; text-align: left; }
    th { background: Canvas; }
    tr[data-bad="true"] { font-weight: 700; text-decoration: underline; }
  </style>
  <h1>scraper sweep — corpus ${rows.length} ไฟล์</h1>
  <pre>${escape(JSON.stringify({ verdict, fixtureGaps: gaps, coverage }, null, 2))}</pre>
  <table>
    <thead><tr>${columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr data-bad="${row.ok === false}">${columns
              .map((column) => `<td>${escape(row[column] ?? "")}</td>`)
              .join("")}</tr>`,
        )
        .join("")}
    </tbody>
  </table>
`;
