import fs from "node:fs";
import path from "node:path";

import {
  EXAM_TABLE_URL,
  downloadAs,
  EXTENSION_DIR,
  expect,
  flat,
  openRegistrar,
  STUDY_TABLE_URL,
  test,
} from "./extension-fixtures";

// ไฟล์นี้ไม่ผูกกับ #### Scenario: ใน openspec/specs — โดยตั้งใจ
// มันตรวจสิ่งที่มีแต่ extension จริงเท่านั้นถึงจะตรวจได้ : manifest, การ inject
// content script, boot.js, ฟอนต์ที่ bundle มา และ stylesheet ของ reg เอง
// e2e/coverage.mjs จึงไม่มองหา capability ชื่อ "extension"

test("content script ทำงานบน URL จริงและ boot.js แทนที่หน้าเดิม", async ({
  regPage,
}) => {
  const { page, errors } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  const blocks = await page.locator("[style*='grid-column']").count();
  expect(blocks).toBeGreaterThan(0);
  await expect(page.getByText("SATURDAY CLASS")).toBeVisible();
  // หน้าเดิมของ reg ถูกล้างแล้ว ไม่ใช่แค่แทรกของเราเข้าไป
  await expect(page.locator("body")).not.toContainText("ตารางเรียนส่วนบุคคล");
  expect(errors).toEqual([]);
});

test("picker ตรงกับหัวตารางบน extension จริง", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  // เคยโชว์ปีล่าสุดเสมอเพราะ scraper อ่านปีไม่ออก (fix-study-term-scrape)
  // หน้าเลือกเทอมที่ intercept ไว้มีแต่ select#year กับ select#semester ของจริง
  const pill = flat(
    await page.evaluate(
      () =>
        [...document.querySelectorAll("p")]
          .map((node) => node.textContent)
          .find((text) => text.trim().startsWith("ประจำภาคเรียน")) ?? "",
    ),
  );
  expect(pill).toBe("ประจำภาคเรียนที่ 2 ปีการศึกษา 2566");
  expect(flat(await page.getByLabel("ปีการศึกษา").textContent())).toBe(
    "ปีการศึกษา 2566",
  );
  expect(flat(await page.getByLabel("ภาคเรียน").textContent())).toBe(
    "ภาคเรียนที่ 2",
  );
});

test("ฟอนต์ Prompt โหลดจริงใน extension", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  // ฟอนต์อยู่ใน JS chunk ไม่ใช่ใน CSS ที่ build ออกมา — ต้องอ่านจาก document.fonts
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (font) => font.family.includes("Prompt") && font.status === "loaded",
    );
  });
  expect(loaded).toBe(true);
});

test("สลับเทอมผ่าน services/reg.js จริง", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);
  const before = await page.locator("[style*='grid-column']").count();

  await page.getByLabel("ภาคเรียน").click();
  await page.waitForTimeout(400);
  await page.getByRole("option", { name: "ภาคเรียนที่ 1" }).first().click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("ไม่มีข้อมูลภาคเรียนนี้")).toBeVisible();

  await page.getByLabel("ภาคเรียน").click();
  await page.waitForTimeout(400);
  await page.getByRole("option", { name: "ภาคเรียนที่ 2" }).first().click();
  await page.waitForTimeout(1500);
  expect(await page.locator("[style*='grid-column']").count()).toBe(before);
});

test("customize menu และ old design toggle ทำงานใน extension", async ({
  regPage,
}) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  await page.getByLabel("ปรับแต่งสีตาราง").click();
  await expect(
    page.locator('[role="dialog"][aria-label="ปรับแต่งสี"]'),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "แบบเดิม" }).click();
  await page.waitForTimeout(700);
  expect(await page.locator(".kmitl-table table").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "แบบใหม่" }).click();
  await page.waitForTimeout(700);
});

test("reg CSS ไม่เอื้อมถึง UI ของเราในโหมดใหม่ และคืนให้หน้าเดิมในโหมดเดิม", async ({
  regPage,
}) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  // registrar.css เขียน SELECT/INPUT ระดับ element และเป็น unlayered จึงชนะ
  // utility ของ tailwind เสมอ — โหมดใหม่ต้องปิด stylesheet ของ reg ไว้ทั้งหมด
  const redesigned = await page.evaluate(() => {
    const picker = document.querySelector('[aria-label="ปีการศึกษา"]');
    const style = picker ? getComputedStyle(picker) : null;
    return {
      regDisabled: [...document.querySelectorAll("link[type='text/css']")].map(
        (link) => link.disabled,
      ),
      picker: style
        ? `${style.fontSize} ${style.fontFamily.split(",")[0]} ${style.color}`
        : null,
    };
  });
  expect(redesigned.picker).toBe("13px Prompt rgb(16, 21, 27)");
  expect(redesigned.regDisabled.every(Boolean)).toBe(true);

  await page.getByRole("button", { name: "แบบเดิม" }).click();
  await page.waitForTimeout(800);

  // โหมดเดิมต้องหน้าตาเหมือนหน้า reg ที่ไม่ได้ลง extension ทุกประการ
  const legacy = await page.evaluate(() => {
    const cell = document.querySelector(".kmitl-table td");
    const style = cell ? getComputedStyle(cell) : null;
    return {
      regDisabled: [...document.querySelectorAll("link[type='text/css']")].map(
        (link) => link.disabled,
      ),
      cell: style
        ? `${style.fontSize} ${style.fontFamily.split(",")[0]} ${style.fontWeight}`
        : null,
    };
  });
  expect(legacy.regDisabled.every((disabled) => disabled === false)).toBe(true);
  expect(legacy.cell).toContain("Microsoft Sans Serif");
});

test("PNG export จาก extension จริง", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  const file = await downloadAs(page);
  const saved = path.join(
    fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "kmitl-e2e-")),
    "study.png",
  );
  await file.saveAs(saved);
  expect(fs.statSync(saved).size).toBeGreaterThan(50_000);
});

test("ตารางสอบ render บน extension จริง", async ({ regPage }) => {
  const { page, errors } = regPage;
  await openRegistrar(page, EXAM_TABLE_URL);

  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.locator("tbody")).toContainText("ไม่ทราบ");
  expect(errors).toEqual([]);
});

test("สลับ Mid/Final ด้วย fetch ในหน้า ไม่มี navigation", async ({ regPage }) => {
  const { page, requests } = regPage;
  await openRegistrar(page, EXAM_TABLE_URL);

  let navigated = false;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      navigated = true;
    }
  });
  const before = requests.length;

  await page.getByRole("button", { name: "ปลายภาค" }).click();
  await page.waitForTimeout(2500);

  expect(navigated).toBe(false);
  await expect(page.locator("tbody tr")).not.toHaveCount(0);
  expect(
    flat(
      await page
        .locator('[aria-label="รอบสอบ"] [aria-pressed="true"]')
        .textContent(),
    ),
  ).toBe("ปลายภาค");

  // ฟิลด์ที่ยิงไปต้องเป็นชุดเดียวกับที่ <form> ของ reg เคยส่ง รวมทั้ง student_id ว่าง
  const sent = requests
    .slice(before)
    .findLast((request) => request.url.includes("report_examtable_show.php"));
  expect(sent.body).toMatch(/(^|&)year=\d{4}/);
  expect(sent.body).toMatch(/(^|&)semester=\d/);
  expect(sent.body).toMatch(/(^|&)student_id=(&|$)/);
  expect(sent.body).toMatch(/mid_or_final=F/);
});

test("แบบเดิมตามรอบที่แสดงอยู่บน extension จริง", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, EXAM_TABLE_URL);

  await page.getByRole("button", { name: "ปลายภาค" }).click();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "แบบเดิม" }).click();
  await page.waitForTimeout(900);

  const round = await page.evaluate(
    () => document.querySelector(".kmitl-table #mid_or_final")?.value ?? "ไม่มี",
  );
  expect(round).toBe("F");
});

test("PNG export ตารางสอบจาก extension จริง", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, EXAM_TABLE_URL);

  const file = await downloadAs(page);
  expect(file.suggestedFilename()).toMatch(/\.png$/);
});

test("ไอคอนถูก emit และ manifest ชี้ถูก", async () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(EXTENSION_DIR, "manifest.json"), "utf8"),
  );
  const icons = Object.values(manifest.icons ?? {});
  expect(icons.length).toBeGreaterThan(0);
  for (const icon of icons) {
    expect(fs.existsSync(path.join(EXTENSION_DIR, icon))).toBe(true);
  }
});

test("ภาพแนวตั้ง export ได้จาก extension จริง", async ({ regPage }) => {
  const { page } = regPage;
  await openRegistrar(page, STUDY_TABLE_URL);

  // แนวตั้ง mount ผืนภาพนอกจอแล้วถ่าย — คนละทางกับแนวนอนที่ถ่ายของบนจอ
  // ต้องพิสูจน์บน bundle จริง ไม่ใช่แค่ใน harness
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();
  const pending = page.waitForEvent("download", { timeout: 60_000 });
  await page
    .getByRole("button", { name: "ดาวน์โหลดแนวตั้ง", exact: true })
    .click();
  const file = await pending;

  const saved = path.join(
    fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "kmitl-e2e-")),
    "portrait.png",
  );
  await file.saveAs(saved);
  const buffer = fs.readFileSync(saved);
  expect(buffer.readUInt32BE(16)).toBe(1080);
  expect(buffer.readUInt32BE(20)).toBe(2520);

  // และผืนภาพถูกเก็บกวาดหลังถ่าย
  expect(
    await page.evaluate(
      () => document.querySelectorAll('[style*="left: -10000px"]').length,
    ),
  ).toBe(0);
});
