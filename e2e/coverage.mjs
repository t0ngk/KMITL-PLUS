// ทุก scenario ใน openspec/specs ต้องมี test ที่ชื่อตรงกันตัวอักษรต่อตัวอักษร
//
//   pnpm e2e:coverage
//
// ไม่เปิด browser โดยตั้งใจ : ต้องตอบได้แม้ตอน suite แดง
//
// ถามทางเดียว — scenario ที่ไม่มี test = ตก ส่วน test ที่ไม่มี scenario = ปกติ
// (e2e/extension.spec.js ตรวจ manifest, ฟอนต์, CSS bleed ซึ่งไม่ใช่พฤติกรรมในสเปก)
//
// **ไม่มีรายการยกเว้น และห้ามเพิ่ม** (adopt-e2e-suite design decision 3)
// allowlist คือที่ที่การตรวจแบบนี้ตายเสมอ : ยกเว้นอันแรกเพราะยาก แล้วอันที่สอง
// แล้วไม่นานสีเขียวก็ไม่ได้แปลว่าอะไรอีก ถ้ามี scenario ที่เดิน offline ไม่ได้จริง ๆ
// นั่นคือคำถามเชิงออกแบบ ตอบที่ design.md ไม่ใช่ที่นี่

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SPEC_DIR = fileURLToPath(new URL("../openspec/specs/", import.meta.url));
const E2E_DIR = fileURLToPath(new URL("./", import.meta.url));

const scenariosOf = (file) =>
  [...fs.readFileSync(file, "utf8").matchAll(/^#### Scenario:\s*(.+?)\s*$/gm)].map(
    (match) => match[1],
  );

const testTitlesOf = (file) =>
  fs.existsSync(file)
    ? [...fs.readFileSync(file, "utf8").matchAll(/^test\(\s*"([^"]+)"/gm)].map(
        (match) => match[1],
      )
    : null;

const capabilities = fs
  .readdirSync(SPEC_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let scenarioCount = 0;
let coveredCount = 0;
const problems = [];

for (const capability of capabilities) {
  const specFile = path.join(SPEC_DIR, capability, "spec.md");
  if (!fs.existsSync(specFile)) {
    continue;
  }
  const scenarios = scenariosOf(specFile);
  const specPath = path.join(E2E_DIR, `${capability}.spec.js`);
  const titles = testTitlesOf(specPath);

  scenarioCount += scenarios.length;

  if (titles === null) {
    problems.push(
      `${capability}: ไม่มีไฟล์ e2e/${capability}.spec.js — ${scenarios.length} scenario ไม่ถูกเดินเลย`,
    );
    process.stdout.write(`ตก    ${capability}  0/${scenarios.length}\n`);
    continue;
  }

  const missing = scenarios.filter((scenario) => !titles.includes(scenario));
  coveredCount += scenarios.length - missing.length;

  process.stdout.write(
    `${missing.length === 0 ? "ผ่าน " : "ตก   "} ${capability}  ${
      scenarios.length - missing.length
    }/${scenarios.length}\n`,
  );
  for (const scenario of missing) {
    problems.push(`${capability}: ไม่มี test ชื่อ "${scenario}"`);
    process.stdout.write(`        ขาด: ${scenario}\n`);
  }
}

process.stdout.write(`\n${coveredCount}/${scenarioCount} scenario มีเทสต์\n`);

if (problems.length > 0) {
  process.stdout.write(
    "\nชื่อ test ต้องตรงกับ #### Scenario: ตัวอักษรต่อตัวอักษร\n" +
      "ถ้าชื่อใน spec อ่านไม่ดี ให้แก้ที่ spec แล้วให้ test ตามไป ไม่ใช่ในทางกลับกัน\n",
  );
  process.exit(1);
}
