// แตกไฟล์ JSON ที่ได้จาก preview/capture.js ออกเป็นหน้า HTML ราย (ปี, ภาคเรียน)
//
//   node preview/corpus.mjs ~/Desktop/kmitl-corpus-<timestamp>.json
//
// เขียนลง preview/public/corpus/ ซึ่งถูก gitignore ไว้ — ยังไม่ redact ห้าม commit
// สคริปต์นี้เป็นเครื่องมือ dev ไม่ได้ถูก import ที่ไหนและไม่ได้ bundle เข้า extension
//
// เขียนเป็น byte ดิบล้วน ๆ ไม่ decode ระหว่างทาง : หน้า reg เป็น windows-874
// ถ้าเผลอ decode แล้วเขียนกลับเป็น UTF-8 จะเสีย path การ decode ที่ preview ต้องทดสอบ
//
// ทำไมต้องอยู่ใน public/ : ไฟล์ .html ที่วางไว้ที่อื่นใน root ของ vite จะถูก
// HTML pipeline ของ vite จับไปแปลง — อ่านเป็น UTF-8 (ไทยกลายเป็น U+FFFD ทุกตัว)
// แล้วแทรก @vite/client เข้าไปด้วย วัดแล้ว 14764 -> 15300 bytes มี U+FFFD 71 ตัว
// ของใน publicDir ถูกเสิร์ฟดิบ ๆ ไม่ผ่าน transform จึงเป็นที่เดียวที่ byte รอด
//
// public/ ไม่อยู่ใน module graph ของ vite เลย import.meta.glob มองไม่เห็น
// จึงต้องเขียน manifest.json กำกับไว้ให้ฝั่ง browser อ่านรายชื่อไฟล์เอง

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CORPUS_DIR = fileURLToPath(new URL("./public/corpus/", import.meta.url));

const source = process.argv[2];
if (!source) {
  console.error("ใช้: node preview/corpus.mjs <ไฟล์ json จาก capture.js>");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(source, "utf8"));
const pages = payload.pages ?? [];
if (pages.length === 0) {
  console.error("ไม่มี pages ในไฟล์ — ไฟล์ผิดหรือ capture ไม่สำเร็จ");
  process.exit(1);
}

// ชื่อไฟล์ต้องเรียงแล้วอ่านรู้เรื่อง : <หน้า>-<ปี>-<ภาค>[-<รอบสอบ>].html
function fileNameOf(entry) {
  const parts = [entry.page];
  if (entry.year) parts.push(entry.year);
  if (entry.semester) parts.push(entry.semester);
  if (entry.term) parts.push(entry.term);
  return `${parts.join("-")}.html`;
}

fs.mkdirSync(CORPUS_DIR, { recursive: true });

const decoder = new TextDecoder("windows-874", { fatal: false });
const summary = [];
let written = 0;
let skipped = 0;

for (const entry of pages) {
  if (!entry.base64) {
    console.warn(`ข้าม ${fileNameOf(entry)} — ไม่มีข้อมูล (status ${entry.status})`);
    skipped += 1;
    continue;
  }

  const bytes = Buffer.from(entry.base64, "base64");
  if (bytes.byteLength !== entry.bytes) {
    console.warn(
      `เตือน ${fileNameOf(entry)} — ขนาดไม่ตรง (json ${entry.bytes}, จริง ${bytes.byteLength})`,
    );
  }

  const name = fileNameOf(entry);
  fs.writeFileSync(path.join(CORPUS_DIR, name), bytes);
  written += 1;

  // ตรวจ encoding ทันทีหลังเขียน : cp874 ต้องอ่านได้สะอาด และ UTF-8 ต้องพัง
  // (ถ้า UTF-8 อ่านได้ แปลว่า byte ไม่ใช่ของ reg แล้ว มีอะไรแปลง encoding ระหว่างทาง)
  const asThai = decoder.decode(bytes);
  const asUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  summary.push({
    file: name,
    bytes: bytes.byteLength,
    status: entry.status,
    thaiOk: asThai.includes("ตาราง"),
    utf8Broken: asUtf8.includes("�"),
    hasStudyTable: asThai.includes("report_studytable"),
  });
}

const encodingFailures = summary.filter(
  (row) => !row.thaiOk || !row.utf8Broken,
);

// manifest ให้ sweep.js / harness อ่านรายชื่อไฟล์ได้ (public/ ไม่มีใน module graph)
fs.writeFileSync(
  path.join(CORPUS_DIR, "manifest.json"),
  JSON.stringify(
    {
      capturedAt: payload.capturedAt,
      origin: payload.origin,
      files: summary.map((row) => row.file),
    },
    null,
    2,
  ),
);

console.table(summary);
console.log(`เขียน ${written} ไฟล์ ข้าม ${skipped} ลง ${CORPUS_DIR}`);
console.log(`เก็บเมื่อ ${payload.capturedAt} จาก ${payload.origin}`);

if (encodingFailures.length > 0) {
  console.error(
    `\nencoding ผิด ${encodingFailures.length} ไฟล์ :`,
    encodingFailures.map((row) => row.file).join(", "),
  );
  process.exit(1);
}
console.log("encoding ผ่านทุกไฟล์ (cp874 อ่านได้ / utf-8 พัง ตามที่ควรเป็น)");
