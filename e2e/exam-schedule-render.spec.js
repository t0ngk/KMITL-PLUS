import { expect, flat, test, toLegacy, toRedesign } from "./fixtures";

// ชื่อ test ตรงกับ #### Scenario: ใน openspec/specs/exam-schedule-render/spec.md
// ตัวอักษรต่อตัวอักษร — e2e/coverage.mjs ตรวจความตรงนั้น อย่าเปลี่ยนข้างเดียว

const EXAM_HEADERS = [
  "วันสอบ",
  "เวลา",
  "รหัสวิชา",
  "ชื่อวิชา",
  "กลุ่ม",
  "หน่วยกิต",
  "ประเภท",
  "ห้องสอบ",
];

const activeRound = async (page) =>
  flat(
    await page
      .locator('[aria-label="รอบสอบ"] [aria-pressed="true"]')
      .textContent(),
  );

// รอบที่ HTML ดิบของ reg บอก — อ่านจาก <select> ของมันเอง ไม่ใช่จาก UI เรา
const legacyRound = (page) =>
  page.evaluate(
    () => document.querySelector(".kmitl-table #mid_or_final")?.value ?? "ไม่มี",
  );

test("Normal page load", async ({ openApp, consoleErrors }) => {
  const page = await openApp("page=exam");

  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.locator("thead th")).toHaveText(EXAM_HEADERS);
  // จัดกลุ่มตามวันสอบ : แต่ละแถวมีวันของตัวเองอยู่ในคอลัมน์แรก
  await expect(page.locator("tbody tr").first()).toContainText("จันทร์");
  expect(consoleErrors).toEqual([]);
});

test("Subject without scheduled date or time", async ({ openApp }) => {
  const page = await openApp("page=exam");

  const rows = page.locator("tbody tr");
  const unknown = rows.filter({ hasText: "ไม่ทราบ" });
  await expect(unknown).not.toHaveCount(0);

  // รายการที่ไม่มีวัน/เวลา ต้องยังอยู่ในตาราง และถูกเรียงไว้หลังรายการที่มีวัน
  const texts = await rows.allTextContents();
  const firstUnknown = texts.findIndex((text) => text.includes("ไม่ทราบ"));
  const lastKnown = texts.reduce(
    (last, text, index) => (text.includes("ไม่ทราบ") ? last : index),
    -1,
  );
  expect(firstUnknown).toBeGreaterThan(lastKnown);
});

test("Duplicate subject rows", async ({ openApp }) => {
  const page = await openApp("page=exam");

  // reg เขียนวิชาเดียวซ้ำหลายแถวเมื่อมีหลายประเภทสอบ — ต้องรวมเป็นรายการเดียว
  // ที่ประเภทต่อกัน ไม่ใช่สองแถว
  await expect(page.getByText("ทฤษฎี/ปฏิบัติ").first()).toBeVisible();

  const codes = await page
    .locator("tbody tr td:nth-child(3)")
    .allTextContents();
  const trimmed = codes.map(flat).filter(Boolean);
  expect(new Set(trimmed).size).toBe(trimmed.length);
});

test("Short Gregorian year scraped", async ({ openApp }) => {
  const page = await openApp("page=exam");

  // fixture มีวันสอบเดือน ม.ค. 2024 CE — ต้องแสดงเป็นปีพุทธ 2567
  await expect(page.locator("tbody")).toContainText("2567");
  await expect(page.locator("tbody")).not.toContainText("2024");
});

test("Self-arranged exam", async ({ openApp }) => {
  const page = await openApp("page=exam");

  // reg เขียน "จัดสอบเอง" ในช่องวันที่ เราต้องแสดงเป็น "ไม่ทราบ" ทั้งวันและเวลา
  // และรายการต้องยังอยู่ ไม่ใช่ถูกตัดทิ้ง
  await expect(page.locator("tbody")).not.toContainText("จัดสอบเอง");

  const selfArranged = page.locator("tbody tr").filter({
    hasText: "SEMINAR ON PROFESSIONAL COMMUNICATION SKILLS",
  });
  await expect(selfArranged).toHaveCount(1);
  await expect(selfArranged.locator("td").nth(0)).toHaveText("ไม่ทราบ");
  await expect(selfArranged.locator("td").nth(1)).toHaveText("ไม่ทราบ");
});

test("Switch term type", async ({ openApp, navigations }) => {
  const page = await openApp("page=exam");
  expect(await activeRound(page)).toBe("กลางภาค");

  await page.getByRole("button", { name: "ปลายภาค" }).click();
  await page.waitForTimeout(900);

  expect(await activeRound(page)).toBe("ปลายภาค");
  await expect(page.locator("tbody tr")).not.toHaveCount(0);
  // ไม่ reload : ไม่มี navigation ของ main frame เกิดขึ้นเลยหลังหน้าโหลดเสร็จ
  expect(navigations).toEqual([]);
});

test("While the other round is loading", async ({ openApp }) => {
  const page = await openApp("page=exam&slow=1200");

  await page.getByRole("button", { name: "ปลายภาค" }).click();
  await page.waitForTimeout(300);

  await expect(page.getByText("กำลังโหลด…")).toBeVisible();
  await expect(page.locator(".opacity-60")).toHaveCount(1);
  // ปฏิเสธการเลือกซ้ำต้องบอกด้วยอย่างอื่นนอกจากสี — disabled คือสิ่งที่ AT อ่านได้
  const buttons = page.locator('[aria-label="รอบสอบ"] button');
  for (const button of await buttons.all()) {
    await expect(button).toBeDisabled();
  }

  await page.waitForTimeout(1600);
  expect(await activeRound(page)).toBe("ปลายภาค");
  await expect(page.locator(".opacity-60")).toHaveCount(0);
});

test("The other round fails to load", async ({ openApp }) => {
  const page = await openApp("page=exam&fail=exam");
  const before = await activeRound(page);

  await page.getByRole("button", { name: "ปลายภาค" }).click();
  await page.waitForTimeout(900);

  await expect(page.getByRole("alert")).toHaveText("โหลดตารางสอบไม่สำเร็จ");
  // รอบเดิมยังอยู่ทั้งหน้า ไม่ใช่จอเปล่า และ segmented เด้งกลับไปที่รอบที่แสดงจริง
  expect(await activeRound(page)).toBe(before);
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.locator(".opacity-60")).toHaveCount(0);
});

test("Toggle old design", async ({ openApp }) => {
  const page = await openApp("page=exam");

  await toLegacy(page);
  expect(await legacyRound(page)).toBe("M");
  await expect(page.locator(".kmitl-table table").first()).toBeVisible();

  await toRedesign(page);
  await expect(page.locator('[aria-label="รอบสอบ"]')).toBeVisible();
});

test("Toggle old design after switching round", async ({ openApp }) => {
  const page = await openApp("page=exam");

  await page.getByRole("button", { name: "ปลายภาค" }).click();
  await page.waitForTimeout(900);
  await toLegacy(page);

  // HTML ดิบต้องเป็นของรอบที่กำลังดูอยู่ ไม่ใช่ของรอบที่โหลดมาตอนเปิดหน้า
  expect(await legacyRound(page)).toBe("F");
});
