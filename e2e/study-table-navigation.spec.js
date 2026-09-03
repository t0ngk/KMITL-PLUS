import {
  chooseOption,
  expect,
  pickerText,
  subjectBlocks,
  termPill,
  test,
} from "./fixtures";

// ชื่อ test ตรงกับ #### Scenario: ใน openspec/specs/study-table-navigation/spec.md
// ตัวอักษรต่อตัวอักษร — e2e/coverage.mjs ตรวจความตรงนั้น

test("Options load on study table view", async ({ openApp }) => {
  const page = await openApp("page=study");

  await expect(page.getByLabel("ปีการศึกษา")).toBeVisible();
  await expect(page.getByLabel("ภาคเรียน")).toBeVisible();

  await page.getByLabel("ปีการศึกษา").click();
  await page.waitForTimeout(350);
  // ปีที่เสนอต้องเป็นปีที่ reg เสิร์ฟให้บัญชีนี้ ไม่ใช่ช่วงที่เราคิดเอง
  expect(await page.getByRole("option").allTextContents()).toEqual([
    "ปีการศึกษา 2567",
    "ปีการศึกษา 2566",
    "ปีการศึกษา 2565",
    "ปีการศึกษา 2564",
  ]);
});

test("Options unavailable", async ({ openApp }) => {
  const page = await openApp("page=study&terms=fail");

  // ดึงหน้าเลือกเทอมไม่ได้เลย -> ไม่มี picker แต่ตารางที่แสดงอยู่ยังใช้ได้
  await expect(page.getByLabel("ปีการศึกษา")).toHaveCount(0);
  await expect(page.getByLabel("ภาคเรียน")).toHaveCount(0);
  await expect(subjectBlocks(page)).not.toHaveCount(0);
  await expect(page.getByRole("button", { name: "แบบเดิม" })).toBeVisible();
});

test("Switch to a past term with data", async ({ openApp, navigations }) => {
  const page = await openApp("page=study&term=3/2565");

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 2");

  await expect(subjectBlocks(page)).not.toHaveCount(0);
  // หัวตารางต้องสะท้อนเทอมที่เลือก และต้องไม่มี navigation เกิดขึ้น
  expect(await termPill(page)).toContain("ประจำภาคเรียนที่ 2");
  expect(await pickerText(page, "ปีการศึกษา")).toBe("ปีการศึกษา 2565");
  expect(navigations).toEqual([]);
});

test("Switch to a term without data", async ({ openApp }) => {
  const page = await openApp("page=study");
  const before = await subjectBlocks(page).count();
  expect(before).toBeGreaterThan(0);

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 1");

  // empty state ชัดเจน ไม่ใช่จอเปล่าและไม่ใช่ตารางเดิมที่อ้างว่าเป็นเทอมใหม่
  await expect(page.getByText("ไม่มีข้อมูลภาคเรียนนี้")).toBeVisible();
  await expect(subjectBlocks(page)).toHaveCount(0);
});

test("Fetch failure during switch", async ({ openApp }) => {
  const page = await openApp("page=study&fail=study");
  const before = await subjectBlocks(page).count();

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 1");

  await expect(page.getByRole("alert")).toHaveText("โหลดตารางเรียนไม่สำเร็จ");
  // ตารางเดิมยังอยู่ครบ และ picker เด้งกลับไปที่เทอมที่แสดงอยู่จริง
  await expect(subjectBlocks(page)).toHaveCount(before);
  expect(await pickerText(page, "ภาคเรียน")).toBe("ภาคเรียนที่ 2");
  await expect(page.locator(".opacity-60")).toHaveCount(0);
});

test("Past term contains Thai subject names", async ({ openApp }) => {
  const page = await openApp("page=study");

  // fixture มีวิชาชื่อไทยพร้อมห้องและอาคารเป็นไทย — ถ้า decode windows-874 พลาด
  // จะกลายเป็น mojibake หรือ U+FFFD
  const thai = subjectBlocks(page).filter({ hasText: "การเขียนโปรแกรมบนเว็บ" });
  await expect(thai).toHaveCount(1);
  await expect(thai).toContainText("ห้องปฏิบัติการคอมพิวเตอร์");

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).not.toContain("�");
});

test("Download after switching terms", async ({ openApp }) => {
  const page = await openApp("page=study&term=3/2565");
  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 2");

  const download = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);

  // กรอบ capture คือแผ่นตาราง picker อยู่นอกกรอบเสมอ
  const outside = await page.evaluate(() => {
    const sheet = document.querySelector('[class*="rounded-xl"][class*="border"]');
    const picker = document.querySelector('[aria-label="ปีการศึกษา"]');
    return Boolean(sheet && picker && !sheet.contains(picker));
  });
  expect(outside).toBe(true);
  // และสิ่งที่อยู่ในกรอบคือเทอมที่เพิ่งเลือก ไม่ใช่เทอมตอนเปิดหน้า
  expect(await termPill(page)).toContain("ประจำภาคเรียนที่ 2");
});
