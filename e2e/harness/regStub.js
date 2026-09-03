// stub ของ services/reg สำหรับ harness เท่านั้น — ไม่ได้อยู่ในโค้ดที่ ship
// vite.config.js ของ preview alias "../../services/reg" มาที่ไฟล์นี้
//
// คืน Document จาก fixture จริง (ไม่ใช่หน้าเปล่า) การสลับเทอมในหน้า preview
// จึงเดินผ่าน scrapeStudyTablePage เหมือนตอนสลับเทอมบนหน้า reg จริง
//
// map ให้ตรงกับ fixture : study-table-mega มีหัวตารางว่า "ประจำภาคเรียนที่ 2"
// ภาค 2 จึงต้องคืน mega ส่วนภาค 1 คืนเทอมว่าง ไม่งั้นหน้าจะ mount ด้วย mega
// แล้วอ้างว่าเป็นภาค 2 ทั้งที่ regStub บอกว่าภาค 2 ว่าง — ขัดกันเอง

import { readTermOptions } from "../../src/services/reg";
import { breakTermCell, FIXTURES, loadFixture } from "./loadFixture";



// ?fail=exam|study : บังคับให้ fetch พัง เพื่อเดิน failure path ได้โดยไม่ต้องตัดเน็ต
const shouldFail = (which) =>
  new URLSearchParams(location.search).get("fail") === which;

// ?slow=<ms> : หน่วง fetch เพื่อให้สถานะกำลังโหลดยาวพอจะสังเกตได้
// fixture ตอบทันที สถานะนี้จึงไม่มีช่วงเวลาให้ดูเลยถ้าไม่หน่วง
const slowDown = async () => {
  const ms = Number(new URLSearchParams(location.search).get("slow") ?? 0);
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
};

const failFetch = (which) => {
  if (shouldFail(which)) {
    throw new Error("preview : บังคับให้ fetch พังตาม ?fail=" + which);
  }
};

// ?header=broken : ลบข้อความในเซลล์เทอมของหัวตาราง เพื่อให้ scraper อ่านเทอมไม่ออก
// สถานะ "ยังไม่รู้ว่าดูเทอมไหน" ไม่มีทางเกิดกับ fixture ปกติ จึงต้องสร้างขึ้นมา
const breakHeaderIfAsked = (doc) => {
  if (new URLSearchParams(location.search).get("header") !== "broken") {
    return doc;
  }
  breakTermCell(doc);
  return doc;
};

// อ่านจาก fixture ของหน้าเลือกเทอมจริงด้วย parser ตัวจริง ไม่ใช่ลิสต์ที่ stub แต่งเอง
// ลิสต์ที่แต่งเองเคยทำให้ walk ผ่านทั้งที่หน้าจริงเสนอภาคเรียนไม่เหมือนกัน
// ?terms=fail|empty : สองทางที่หน้าเลือกเทอมพังได้ ซึ่งสเปกแยกเป็นคนละ scenario
//   fail  = ดึงหน้านั้นไม่ได้เลย (network / session หมดอายุ)
//   empty = ดึงได้แต่ไม่มี option ให้ (โครงหน้าเปลี่ยน)
// ทั้งคู่ต้องจบที่ "ไม่มี picker แต่ตารางยังใช้ได้" แต่มาคนละทาง
export async function fetchTermOptions() {
  const mode = new URLSearchParams(location.search).get("terms");
  if (mode === "fail") {
    throw new Error("preview : บังคับให้หน้าเลือกเทอมพังตาม ?terms=fail");
  }
  const { doc } = await loadFixture(FIXTURES.termSelector);
  if (mode === "empty") {
    for (const option of doc.querySelectorAll("option")) {
      option.remove();
    }
  }
  return readTermOptions(doc);
}

export async function fetchStudyTable(_year, semester) {
  failFetch("study");
  await slowDown();
  const name =
    String(semester) === "1" ? FIXTURES.studyEmpty : FIXTURES.studyMega;
  const { doc } = await loadFixture(name);
  return breakHeaderIfAsked(doc);
}

// มี exam fixture ไฟล์เดียว จึงคืนไฟล์เดิมแล้วปรับค่า #mid_or_final ให้ตรงรอบที่ขอ
// (scrapeHeader อ่าน data.term จากตรงนั้น) — พอให้เห็นว่าการสลับรอบเดินครบวงจร
// สิ่งที่ยังพิสูจน์ไม่ได้ในที่นี้คือ payload ของอีกรอบ "หน้าตาต่างกันจริงไหม"
export async function fetchExamTable(_year, _semester, _studentId, midOrFinal) {
  failFetch("exam");
  await slowDown();
  const { doc } = await loadFixture(FIXTURES.examMega);
  const select = doc.querySelector("#mid_or_final");
  if (select && midOrFinal) {
    // ต้องเขียน attribute selected ไม่ใช่ property value : oldHtml เกิดจาก
    // body.innerHTML ซึ่ง serialize เฉพาะ attribute — ถ้าตั้งแต่ property
    // "แบบเดิม" จะยังโชว์รอบเก่าทั้งที่หน้าใหม่เปลี่ยนแล้ว
    for (const option of select.options) {
      if (option.value === midOrFinal) {
        option.setAttribute("selected", "selected");
      } else {
        option.removeAttribute("selected");
      }
    }
  }
  return doc;
}
