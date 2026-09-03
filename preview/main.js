// preview harness : mount หน้าจริงด้วย fixture ที่ redact แล้ว
//
//   /?page=study  ตารางเรียน (ค่าเริ่มต้น)
//   /?page=exam   ตารางสอบ
//
// ป้อน Document เข้า scraper ตัวจริงเหมือน core/boot.js ไม่ใช่ป้อน object ที่ scrape เสร็จแล้ว
// เพราะ scraper คือส่วนที่เปราะที่สุด (อ่าน DOM ด้วยลำดับ childNodes ตายตัว)
//
// สิ่งที่ preview ยังไม่ครอบคลุม : boot.js (ทางถอยเมื่อ scrape พัง) และการถอด
// stylesheet ของ reg ในหน้าตารางสอบ — สองอย่างนี้ต้องดูบนหน้าจริงเท่านั้น

import { mount } from "svelte";

import "./preview.css";
import "../src/assets/fonts.css";
import ExamSchedule from "../src/features/exam-schedule/ExamSchedule.svelte";
import StudyTable from "../src/features/study-table/StudyTable.svelte";
import { scrapeExamPage } from "../src/features/exam-schedule/scraper";
import { scrapeStudyTablePage } from "../src/features/study-table/scraper";
import { captureRegistrarStyles } from "../src/shared/registrarStyles";
import {
  breakTermCell,
  FIXTURES,
  loadFixture,
  loadRegistrarStylesheet,
  rewriteTermCell,
} from "./loadFixture";

const PAGES = {
  study: {
    title: "ตารางเรียน",
    fixture: FIXTURES.studyMega,
    component: StudyTable,
    scrape: scrapeStudyTablePage,
    toProps: (scraped, bodyHtml) => ({
      schedule: scraped.schedule,
      info: scraped.info,
      oldTable: bodyHtml,
    }),
  },
  exam: {
    title: "ตารางสอบ",
    fixture: FIXTURES.examMega,
    component: ExamSchedule,
    scrape: scrapeExamPage,
    toProps: (scraped, bodyHtml) => ({
      schedule: scraped.schedule,
      data: scraped.data,
      oldDesign: bodyHtml,
    }),
  },
};

// โหลด stylesheet ของ reg เข้ามาก่อน เพื่อให้ harness อยู่ใต้กฎชุดเดียวกับหน้าจริง
// (?reg=off ปิดไว้เทียบได้)
const params = new URLSearchParams(location.search);
if (params.get("reg") !== "off") loadRegistrarStylesheet();
// เลียนลำดับของ core/boot.js : จำ stylesheet ของ reg ไว้ก่อน mount
// ไม่งั้น $effect ใน component จะ toggle ของว่าง
captureRegistrarStyles();

const requested = params.get("page") ?? "study";
const page = PAGES[requested] ?? PAGES.study;
document.title = `KMITL + preview — ${page.title}`;

const { doc, bodyHtml } = await loadFixture(page.fixture);

// ?header=broken : ลบข้อความในเซลล์เทอม เพื่อจำลองหน้าที่ scraper อ่านเทอมไม่ออก
// fixture ปกติอ่านออกเสมอ สถานะ "ยังไม่รู้ว่าดูเทอมไหน" จึงไม่มีทางเกิดถ้าไม่ทำแบบนี้
// (regStub.js ทำแบบเดียวกันกับหน้าที่ fetch มาทีหลัง)
if (params.get("header") === "broken") {
  breakTermCell(doc);
}

// ?term=3/2565 : เปิดหน้ามาบนเทอมอื่น — fixture ที่ commit ไว้เป็นภาค 2/2566 อย่างเดียว
if (params.get("term")) {
  const [semester, year = "2566"] = params.get("term").split("/");
  rewriteTermCell(doc, semester, year);
}

const scraped = page.scrape(doc);

if (!scraped) {
  // บนหน้าจริง boot.js จะปล่อยหน้าเดิมไว้ ที่นี่ไม่มีหน้าเดิม จึงบอกให้ชัดว่าพังตรงไหน
  document.body.textContent = `scrape ${page.fixture} ไม่สำเร็จ — scraper คืน null`;
} else {
  mount(page.component, {
    target: document.body,
    props: page.toProps(scraped, bodyHtml),
  });
}
