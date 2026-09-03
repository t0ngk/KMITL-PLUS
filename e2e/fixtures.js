import { expect, test as base } from "@playwright/test";

// fixture ของ project "preview" — เปิดหน้าที่ mount ด้วย fixture ที่ redact แล้ว
//
// query ที่ preview รับ (adopt-e2e-suite design decision 3 / task 7.3) :
//   page=study|exam     เลือกหน้า
//   reg=off             ไม่โหลด stylesheet ของ reg
//   slow=<ms>           หน่วง fetch ให้สถานะกำลังโหลดยาวพอจะสังเกตได้
//   fail=study|exam     บังคับให้ fetch พัง
//   header=broken       ลบเซลล์เทอมในหัวตาราง ให้ scraper อ่านเทอมไม่ออก
//   term=<ภาค>/<ปี>      เปิดหน้ามาบนเทอมอื่น
//
// สี่ตัวหลังไม่ใช่ของเล่น : loading, failure และ "ไม่รู้ว่าดูเทอมไหน" ไม่มีช่วงเวลา
// ให้จับเลยถ้า fixture ตอบทันที — ไม่มีมันก็เดิน scenario พวกนั้นไม่ได้

export { expect };

export const test = base.extend({
  // เก็บ error ทุกอันไว้ให้ test ปิดท้ายด้วย expect ได้ โดยไม่ต้องผูก listener เอง
  consoleErrors: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    await use(errors);
  },

  // จับ navigation ของ main frame — หลาย scenario ยืนยันว่า "ไม่ reload"
  // openApp ล้างรายการนี้หลังเปิดหน้าเสร็จ สิ่งที่เหลืออยู่จึงเป็น navigation
  // ที่เกิดจากการกระทำใน test เท่านั้น ไม่ใช่การเปิดหน้าครั้งแรก
  navigations: async ({ page }, use) => {
    const seen = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        seen.push(frame.url());
      }
    });
    await use(seen);
  },

  // เปิด app.html พร้อม query แล้วรอให้ mount เสร็จ
  openApp: async ({ page, navigations }, use) => {
    await use(async (query = "page=study") => {
      await page.goto(`/app.html?${query}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      navigations.length = 0;
      return page;
    });
  },
});

// reg คั่น label กับค่าด้วย &nbsp; ตัวเดียว และเราไม่ได้แตะมัน (แตะแค่ตัวคั่นคอลัมน์)
// การเทียบข้อความจึงต้องยุบช่องว่างทุกชนิดก่อน ไม่งั้นเทียบกับ " " ธรรมดาแล้วไม่ตรง
export const flat = (text) => (text ?? "").replace(/\s+/g, " ").trim();

export const pickerText = async (page, label) =>
  flat(await page.getByLabel(label).textContent());

export const termPill = async (page) =>
  flat(
    await page.evaluate(
      () =>
        [...document.querySelectorAll("p")]
          .map((node) => node.textContent)
          .find((text) => text.trim().startsWith("ประจำภาคเรียน")) ?? "",
    ),
  );

// บล็อกวิชาคือ div ที่ระบายสีตามธีม ซ้อนอยู่ใน wrapper ที่วางด้วย grid-column
// ต้องระบุ wrapper ด้วย ไม่งั้นจะนับป้ายภาคเรียนบนหัวตารางเข้ามาด้วย (มันก็ระบายสี)
export const subjectBlocks = (page) =>
  page.locator('[style*="grid-column"] [style*="background-color"]');

export const legacyRowCount = (page) =>
  page.locator(".kmitl-table table tr").count();

export const toLegacy = async (page) => {
  await page.getByRole("button", { name: "แบบเดิม" }).click();
  await page.waitForTimeout(450);
};

export const toRedesign = async (page) => {
  await page.getByRole("button", { name: "แบบใหม่" }).click();
  await page.waitForTimeout(350);
};

export const chooseOption = async (page, label, option) => {
  await page.getByLabel(label).click();
  await page.waitForTimeout(350);
  await page.getByRole("option", { name: option, exact: true }).click();
  await page.waitForTimeout(1200);
};

// ปุ่มดาวน์โหลดเปิดเมนูรูปแบบ ไม่ได้โหลดทันทีอีกแล้ว (wallpaper-export decision 7)
export const downloadAs = async (page, format = "แนวนอน") => {
  const pending = page.waitForEvent("download", { timeout: 40_000 });
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();
  await page.getByRole("button", { name: format, exact: true }).click();
  return pending;
};

// ตั้งสวิตช์ของภาพแนวตั้งก่อนกดดาวน์โหลด — เมนูต้องเปิดค้างไว้ระหว่างตั้ง
export const downloadPortrait = async (page, { reserve = true, fit = true } = {}) => {
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();
  await page.getByLabel("เผื่อพื้นที่นาฬิกา").setChecked(reserve);
  const fitBox = page.getByLabel("เฉพาะวัน/เวลาที่มีเรียน");
  if ((await fitBox.count()) > 0) {
    await fitBox.setChecked(fit);
  }
  const pending = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "ดาวน์โหลดแนวตั้ง", exact: true }).click();
  return pending;
};
