// สร้าง fixture ที่ commit ได้จาก corpus : redact ข้อมูลส่วนตัว + ต่อแถวเคสที่ของจริงไม่มี
//
//   node e2e/harness/tools/redact.mjs scan
//   node e2e/harness/tools/redact.mjs build --replace "<ของจริง>=<ของปลอม>" [--replace ...]
//
// `scan` จะบอกว่ามีอะไรที่ดูเหมือนข้อมูลส่วนตัวอยู่ตรงไหนบ้าง ให้เอาไปกรอก --replace
// ค่าจริงไม่เคยถูกเขียนลงไฟล์นี้ : ไฟล์นี้ถูก commit ส่วนค่าจริงมาจาก argv บนเครื่อง dev
//
// อ่านจาก preview/public/corpus/ (gitignore) เขียนลง preview/public/fixtures/ (commit ได้)
// ทั้งสองอยู่ใต้ public/ เพราะ vite แปลง .html ที่อื่นจน byte windows-874 พัง (ดู design.md)

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CORPUS_DIR = fileURLToPath(new URL("../public/corpus/", import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL("../public/fixtures/", import.meta.url));

// ---------------------------------------------------------------- encoding

const decoder = new TextDecoder("windows-874");

// TIS-620 : 0x00-0x7F เป็น ASCII ตรง ๆ, 0xA1-0xFB map เชิงเส้นไป U+0E01-U+0E5B
// ตรวจกับ corpus จริงแล้ว 37/37 ไฟล์ decode->encode ได้ byte เดิมเป๊ะ
// และไม่มี byte ในช่วง 0x80-0x9F (ส่วนที่ windows-874 เพิ่มจาก TIS-620) เลย
//
// โยน error เมื่อเจออักขระนอกตาราง โดยตั้งใจ : ชื่อปลอมที่ใส่เข้าไปต้องเป็น
// อักขระที่ reg มีทางส่งออกมาได้จริงเท่านั้น ไม่ใช่ตัวที่หน้าเว็บนี้เข้ารหัสไม่ได้
function encodeTis620(text) {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code <= 0x7f) {
      out[index] = code;
    } else if (code >= 0x0e01 && code <= 0x0e5b) {
      out[index] = code - 0x0e01 + 0xa1;
    } else {
      const around = text.slice(Math.max(0, index - 20), index + 20);
      throw new Error(
        `เข้ารหัส TIS-620 ไม่ได้ : U+${code.toString(16).toUpperCase()} ที่ตำแหน่ง ${index} — "${around}"`,
      );
    }
  }
  return Buffer.from(out);
}

function readPage(name) {
  return decoder.decode(fs.readFileSync(path.join(CORPUS_DIR, name)));
}

// ---------------------------------------------------------------- แถวในตาราง

const ROW_PATTERN = /<tr>[\s\S]*?<\/tr>/gi;
const SUBJECT_CELL_COUNT = 18;

const cellCount = (row) => (row.match(/<td\b/gi) ?? []).length;
const isSubjectRow = (row) => cellCount(row) === SUBJECT_CELL_COUNT;

/** แทนที่ "เนื้อใน" ของ <td> ลำดับที่ index โดยไม่แตะแท็กหรือ attribute */
function setCell(row, index, text) {
  let seen = -1;
  return row.replace(/(<td\b[^>]*>)([\s\S]*?)(<\/td>)/gi, (match, open, _inner, close) => {
    seen += 1;
    return seen === index ? `${open}${text}${close}` : match;
  });
}

const readCell = (row, index) => {
  const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
  return cells[index]?.[1] ?? "";
};

// ลำดับ <td> -> ความหมาย (ตรงกับ childNodes ที่ scrapeTable อ่าน : td[n] = childNodes[2n+1])
const CELL = {
  no: 0,
  code: 2,
  name: 4,
  credit: 6,
  lectureSec: 8,
  labSec: 10,
  period: 12,
  room: 14,
  building: 16,
  remark: 17,
};

// ---------------------------------------------------------------- scan

function scan() {
  const files = fs.readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".html"));
  const idCounts = new Map();
  const nameCounts = new Map();

  for (const file of files) {
    const text = readPage(file);
    // รหัสนักศึกษาอยู่ในแถวหัวตารางที่มี <strong> คั่น และใน input hidden ของหน้าตารางสอบ
    for (const match of text.matchAll(
      /<strong>[^<]*<\/strong>&nbsp;(\d{6,10})&nbsp;/g,
    )) {
      idCounts.set(match[1], (idCounts.get(match[1]) ?? 0) + 1);
    }
    for (const match of text.matchAll(
      /name="student_id"[^>]*value="(\d+)"/gi,
    )) {
      idCounts.set(match[1], (idCounts.get(match[1]) ?? 0) + 1);
    }
    // ชื่อ : ข้อความไทยที่ตามหลัง <strong>...</strong>&nbsp; ในแถวเดียวกับรหัส
    for (const match of text.matchAll(
      /<strong>[^<]*<\/strong>&nbsp;([฀-๿]+)&nbsp;([฀-๿]+)/g,
    )) {
      for (const part of [match[1], match[2]]) {
        nameCounts.set(part, (nameCounts.get(part) ?? 0) + 1);
      }
    }
  }

  console.log(`สแกน ${files.length} ไฟล์ใน ${CORPUS_DIR}\n`);
  console.log("รหัสที่พบ (น่าจะเป็นรหัสนักศึกษา) :");
  for (const [value, count] of [...idCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${value}   x${count}`);
  }
  console.log("\nคำไทยที่พบในตำแหน่งชื่อ :");
  for (const [value, count] of [...nameCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${value}   x${count}`);
  }
  console.log(
    '\nเอาไปใช้ต่อ :\n  node e2e/harness/tools/redact.mjs build --replace "<ของจริง>=<ของปลอม>" --replace ...',
  );
}

// ---------------------------------------------------------------- build

function parseReplacements(argv) {
  const pairs = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--replace") continue;
    const raw = argv[index + 1] ?? "";
    const split = raw.indexOf("=");
    if (split <= 0) {
      throw new Error(`--replace ต้องเป็นรูปแบบ "ของจริง=ของปลอม" ได้รับ "${raw}"`);
    }
    pairs.push({ from: raw.slice(0, split), to: raw.slice(split + 1) });
  }
  return pairs;
}

function redact(text, replacements, file) {
  let out = text;
  for (const { from, to } of replacements) {
    const before = out.split(from).length - 1;
    if (before === 0) continue;
    out = out.split(from).join(to);
  }
  for (const { from } of replacements) {
    if (out.includes(from)) {
      throw new Error(`${file} : ยังเหลือ "${from}" หลัง redact`);
    }
  }
  return out;
}

// แถวเคสที่ corpus จริงไม่มี (ดู tasks.md 2.5) — ทุกแถว copy โครงจากแถวจริงมาทั้งดุ้น
// แก้เฉพาะข้อความในเซลล์ ไม่แตะแท็ก จึงยังผ่านเงื่อนไข childNodes == 37 ของ scrapeTable
const FABRICATED = [
  { tag: "robustness", why: "เริ่ม 08:00 ชนขอบซ้ายของกริด", code: "99000001", name: "EARLY MORNING EDGE CASE", sec: "1", period: "จ. 08:00-09:00 น.(ท)", room: "R-101", building: "TEST" },
  { tag: "robustness", why: "จบ 20:00 ชนขอบขวาของกริด", code: "99000002", name: "LATE EVENING EDGE CASE", sec: "1", period: "อ. 19:00-20:00 น.(ท)", room: "R-102", building: "TEST" },
  { tag: "robustness", why: "คาบสั้นสุดที่กริดวาดได้ 15 นาที", code: "99000003", name: "FIFTEEN MINUTE BLOCK", sec: "1", period: "พ. 13:00-13:15 น.(ท)", room: "R-103", building: "TEST" },
  { tag: "robustness", why: "วันเสาร์ (dayIndex 5) ไม่มีในของจริง", code: "99000004", name: "SATURDAY CLASS", sec: "1", period: "ส. 10:00-12:00 น.(ท)", room: "R-104", building: "TEST" },
  { tag: "robustness", why: "ซ้อนเวลากับแถวถัดไป ตัวหลังทับตัวหน้า", code: "99000005", name: "OVERLAP LOWER LAYER", sec: "1", period: "ศ. 14:00-16:00 น.(ท)", room: "R-105", building: "TEST" },
  { tag: "robustness", why: "ซ้อนเวลากับแถวก่อนหน้า", code: "99000006", name: "OVERLAP UPPER LAYER", sec: "2", period: "ศ. 15:00-17:00 น.(ท)", room: "R-106", building: "TEST" },
  { tag: "robustness", why: "ชื่อวันที่ dayIndexOf ไม่รู้จัก -> -1", code: "99000007", name: "UNKNOWN DAY NAME", sec: "1", period: "ฮ. 10:00-11:00 น.(ท)", room: "R-107", building: "TEST" },
  // สอง row นี้ปิด scenario "Both Thai and English day names" ของ spec study-table-render
  // code รองรับอยู่แล้ว (dayIndexOf รับ "Mon", partition รับ "L"/"P") แต่ corpus ไม่เคยมีหน้า en
  // รูปแบบข้อความจริงของหน้า en จึงยังไม่เคยเห็น -> robustness ไม่ใช่ fidelity
  { tag: "robustness", why: "ชื่อวันอังกฤษ Mon + ชนิด (L) บรรยาย", code: "99000008", name: "ENGLISH DAY NAME LECTURE", sec: "1", period: "Mon 17:00-18:00 (L)", room: "R-108", building: "TEST" },
  { tag: "robustness", why: "ชื่อวันอังกฤษ Tue + ชนิด (P) ปฏิบัติ", code: "99000009", name: "ENGLISH DAY NAME PRACTICE", sec: "1", period: "Tue 17:00-18:00 (P)", room: "R-109", building: "TEST" },
];

function buildStudyMega(text) {
  const rows = text.match(ROW_PATTERN) ?? [];
  const subjectRows = rows.filter(isSubjectRow);
  if (subjectRows.length < 2) {
    throw new Error("หาแถววิชาในหน้าต้นแบบไม่เจอ");
  }
  // แถวแรกที่เข้าเงื่อนไขคือหัวตาราง (scrapeTable ทิ้งด้วย R.drop(1)) ต้นแบบจึงเอาแถวที่ 2
  const template = subjectRows[1];
  const lastRow = subjectRows[subjectRows.length - 1];

  let counter = subjectRows.length;
  const extra = FABRICATED.map((item) => {
    counter += 1;
    let row = template;
    row = setCell(row, CELL.no, String(counter - 1));
    row = setCell(row, CELL.code, item.code);
    row = setCell(row, CELL.name, item.name);
    row = setCell(row, CELL.credit, "3 (3-0)");
    row = setCell(row, CELL.lectureSec, item.sec);
    row = setCell(row, CELL.labSec, "<font color='#FF6600'>-</font>");
    row = setCell(row, CELL.period, item.period);
    row = setCell(row, CELL.room, item.room);
    row = setCell(row, CELL.building, item.building);
    row = setCell(row, CELL.remark, "");
    return `\n<!-- ${item.tag} : ${item.why} -->\n${row}`;
  }).join("");

  const at = text.lastIndexOf(lastRow) + lastRow.length;
  return text.slice(0, at) + extra + text.slice(at);
}

const STAMP = (lines) => `\n<!--\n${lines.join("\n")}\n-->\n`;

function build(argv) {
  const replacements = parseReplacements(argv);
  if (replacements.length === 0) {
    throw new Error('ต้องมี --replace อย่างน้อยหนึ่งคู่ (ดู `node e2e/harness/tools/redact.mjs scan`)');
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(CORPUS_DIR, "manifest.json"), "utf8"),
  );

  const plan = [
    {
      out: "study-table-mega.html",
      from: "study-table-2566-2.html",
      splice: buildStudyMega,
      note: [
        "ต่อจากหน้าจริง : แถววิชาทุกแถวถูก copy มาทั้งดุ้น แก้เฉพาะข้อความในเซลล์",
        `แต่งเพิ่ม ${FABRICATED.length} แถว ทุกแถวเป็น robustness (ของจริงไม่มี ดู tasks.md 2.5)`,
        ...FABRICATED.map((item) => `  ${item.code}  ${item.tag}  ${item.why}`),
      ],
    },
    {
      out: "study-table-empty.html",
      from: "study-table-2567-3.html",
      note: ["fidelity ล้วน : ภาคฤดูร้อนที่ไม่ได้ลงทะเบียน ไม่มีการแต่งเพิ่ม"],
    },
    {
      out: "exam-mega.html",
      from: "exam-table-2566-2-M.html",
      note: [
        "fidelity ล้วน : ไม่มีการแต่งเพิ่มเลย",
        "หน้าจริงหน้านี้มีครบทุกเคสอยู่แล้ว : จัดสอบเอง, ไม่มีเวลาสอบ,",
        "ประเภทสอบรวม A/B และวันที่มีหลายวิชา (rowspan)",
      ],
    },
  ];

  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const written = [];

  for (const step of plan) {
    if (!manifest.files.includes(step.from)) {
      throw new Error(`corpus ไม่มี ${step.from}`);
    }
    let text = readPage(step.from);
    const before = (text.match(ROW_PATTERN) ?? []).filter(isSubjectRow).length;

    if (step.splice) text = step.splice(text);
    text = redact(text, replacements, step.out);

    const rows = (text.match(ROW_PATTERN) ?? []).filter(isSubjectRow);
    // ยามข้อ 1 : ทุกแถววิชาต้องมี <td> ครบ 18 ตัว (= childNodes 37 ที่ scrapeTable กรอง)
    const malformed = rows.filter((row) => cellCount(row) !== SUBJECT_CELL_COUNT);
    if (malformed.length > 0) {
      throw new Error(`${step.out} : มีแถววิชาที่ <td> ไม่ครบ ${SUBJECT_CELL_COUNT}`);
    }
    // ยามข้อ 2 : จำนวนแถวต้องเพิ่มตามจำนวนที่ตั้งใจแต่ง ไม่ขาดไม่เกิน
    const expected = before + (step.splice ? FABRICATED.length : 0);
    if (rows.length !== expected) {
      throw new Error(
        `${step.out} : แถววิชา ${rows.length} ไม่ตรงที่คาด ${expected}`,
      );
    }
    // ยามข้อ 3 : เซลล์ที่ scraper อ่านต้องไม่ว่างในแถวที่แต่งขึ้น
    for (const row of rows.slice(-FABRICATED.length)) {
      if (step.splice && readCell(row, CELL.period).trim() === "") {
        throw new Error(`${step.out} : แถวที่แต่งมีเซลล์คาบว่าง`);
      }
    }

    const stamped =
      text +
      STAMP([
        `fixture : ${step.out}`,
        `สร้างจาก : ${step.from} (corpus เก็บเมื่อ ${manifest.capturedAt})`,
        "redact แล้ว : รหัสและชื่อนักศึกษาเป็นค่าสมมติ",
        ...step.note,
      ]);

    const bytes = encodeTis620(stamped);
    // ยามข้อ 4 : encode แล้ว decode กลับต้องได้ข้อความเดิมเป๊ะ
    if (decoder.decode(bytes) !== stamped) {
      throw new Error(`${step.out} : round-trip TIS-620 ไม่ตรง`);
    }
    // ยามข้อ 5 : ค่าจริงต้องไม่เหลือใน byte ที่จะเขียนจริง
    for (const { from } of replacements) {
      if (decoder.decode(bytes).includes(from)) {
        throw new Error(`${step.out} : ค่าจริงยังเหลืออยู่ใน byte ที่จะเขียน`);
      }
    }

    fs.writeFileSync(path.join(FIXTURE_DIR, step.out), bytes);
    written.push({
      file: step.out,
      from: step.from,
      subjectRows: rows.length,
      fabricated: step.splice ? FABRICATED.length : 0,
      bytes: bytes.byteLength,
    });
  }

  fs.writeFileSync(
    path.join(FIXTURE_DIR, "manifest.json"),
    JSON.stringify(
      {
        builtFrom: manifest.capturedAt,
        origin: manifest.origin,
        files: written.map((row) => row.file),
      },
      null,
      2,
    ),
  );

  console.table(written);
  console.log(`เขียน ${written.length} fixture ลง ${FIXTURE_DIR}`);
  console.log("ยามผ่านครบ : <td> ครบ 18, จำนวนแถวตรง, round-trip TIS-620 ตรง, ไม่เหลือค่าจริง");
}

// ---------------------------------------------------------------- entry

const [command, ...argv] = process.argv.slice(2);
try {
  if (command === "scan") scan();
  else if (command === "build") build(argv);
  else {
    console.error("ใช้: node e2e/harness/tools/redact.mjs scan | build --replace \"จริง=ปลอม\" ...");
    process.exit(1);
  }
} catch (error) {
  console.error(String(error.message ?? error));
  process.exit(1);
}
