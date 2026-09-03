import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect, test as base } from "@playwright/test";

// fixture ของ project "extension" — โหลด extension ที่ build แล้วเข้า Chrome จริง
// แล้ว intercept ทุก request ของ reg ตอบด้วย fixture ที่ redact แล้ว
//
// นี่คือที่เดียวที่ทดสอบ manifest, การ inject content script, boot.js และ
// stylesheet ของ reg เอง — สิ่งที่ preview harness แตะไม่ถึง
//
// สิ่งที่ยังทดสอบไม่ได้แม้ที่นี่ : session/cookie จริง

export { expect };

const dir = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const EXTENSION_DIR = dir("../.output/chrome-mv3");
const FIXTURE_DIR = dir("./harness/public/fixtures");
const profileDir = (browserName) => dir(`./.chrome-profile-${browserName}`);

const readFixture = (name) => fs.readFileSync(path.join(FIXTURE_DIR, name));

export const STUDY_TABLE_URL =
  "https://www.reg.kmitl.ac.th/u_student/report_studytable_show.php";
export const EXAM_TABLE_URL =
  "https://www.reg.kmitl.ac.th/u_student/report_examtable_show.php";
export { EXTENSION_DIR };

export const test = base.extend({
  // worker-scoped : Chrome ที่โหลด extension เปิดครั้งเดียวต่อ worker
  registrar: [
    // Playwright บังคับให้ argument แรกเป็น object destructuring — browserName
    // ใช้จริงเป็นชื่อโปรไฟล์ ไม่ให้ worker คนละ browser ทับโปรไฟล์กัน
    async ({ browserName }, use) => {
      const PROFILE_DIR = profileDir(browserName);
      if (!fs.existsSync(path.join(EXTENSION_DIR, "manifest.json"))) {
        throw new Error(
          "ยังไม่ได้ build extension : รัน pnpm build ก่อน (.output/chrome-mv3 ไม่มี manifest.json)",
        );
      }
      fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

      const context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: false,
        channel: "chromium",
        viewport: { width: 1440, height: 900 },
        acceptDownloads: true,
        args: [
          `--disable-extensions-except=${EXTENSION_DIR}`,
          `--load-extension=${EXTENSION_DIR}`,
        ],
      });

      // request ที่ยิงถึง reg ทุกอัน เก็บไว้ให้ test ตรวจ payload ได้
      const requests = [];

      await context.route("**://*.reg.kmitl.ac.th/**", async (route) => {
        const url = route.request().url();
        const body = route.request().postData() ?? "";
        requests.push({ url, body });

        const html = (buffer) =>
          route.fulfill({
            status: 200,
            headers: { "content-type": "text/html; charset=tis-620" },
            body: buffer,
          });

        if (url.includes("report_studytable_show.php")) {
          const semester = /semester=(\d)/.exec(body)?.[1];
          // mega บอกหัวตารางว่าเป็นภาค 2 -> ภาค 1 คือเทอมว่าง (ตรงกับ e2e/harness/regStub.js)
          return html(
            readFixture(
              semester === "1"
                ? "study-table-empty.html"
                : "study-table-mega.html",
            ),
          );
        }

        // หน้าเลือกเทอมของ reg ตัวจริง ไม่ใช่ของสังเคราะห์ : ลิสต์ที่แต่งเองเคยทำให้
        // walk ผ่านทั้งที่หน้าจริงเสนอภาคเรียนไม่เหมือนกัน
        if (url.includes("report_studytable.php")) {
          return html(readFixture("term-selector.html"));
        }

        if (url.includes("report_examtable_show.php")) {
          const term = /mid_or_final=([MF])/.exec(body)?.[1];
          // มี exam fixture ไฟล์เดียว จึงย้าย selected ไปตามรอบที่ขอ
          let markup = readFixture("exam-mega.html").toString("latin1");
          if (term === "F") {
            markup = markup
              .replace("<option value='M'  selected>", "<option value='M' >")
              .replace("<option value='F' >", "<option value='F'  selected>");
          }
          return html(Buffer.from(markup, "latin1"));
        }

        // registrar.css ตัวจริง — หน้าเดิมต้องได้ style ของตัวเองคืนตอนกด "แบบเดิม"
        if (/\.css(\?|$)/i.test(url)) {
          return route.fulfill({
            status: 200,
            headers: { "content-type": "text/css" },
            body: readFixture("registrar.css"),
          });
        }

        return route.fulfill({ status: 204, body: "" });
      });

      await use({ context, requests });
      await context.close();
    },
    { scope: "worker" },
  ],

  // หน้าใหม่ต่อ test พร้อมที่เก็บ console error ของหน้านั้น
  regPage: async ({ registrar }, use) => {
    const page = await registrar.context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    await use({ page, errors, requests: registrar.requests });
    await page.close();
  },
});

export const openRegistrar = async (page, url) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  return page;
};

export const flat = (text) => (text ?? "").replace(/\s+/g, " ").trim();
