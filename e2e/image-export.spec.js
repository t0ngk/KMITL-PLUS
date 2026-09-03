import { expect, test } from "./fixtures";
import { pngColors } from "./png";

// ชื่อ test ตรงกับ #### Scenario: ใน openspec/specs/image-export/spec.md
// ตัวอักษรต่อตัวอักษร — e2e/coverage.mjs ตรวจความตรงนั้น

const download = async (page) => {
  const pending = page.waitForEvent("download", { timeout: 40_000 });
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  return pending;
};

// dock ต้องอยู่นอกกรอบ capture เสมอ — กรอบคือแผ่นตาราง ไม่ใช่ทั้งหน้า
const dockOutsideFrame = (page) =>
  page.evaluate(() => {
    const sheet = document.querySelector('[class*="rounded-xl"][class*="border"]');
    const dock = document.querySelector('[aria-label="ดาวน์โหลดรูปภาพ"]');
    return Boolean(sheet && dock && !sheet.contains(dock));
  });

test("Study table download", async ({ openApp }) => {
  const page = await openApp("page=study");

  const file = await download(page);
  expect(file.suggestedFilename()).toMatch(/\.png$/);

  // สีธีมกับข้อความไทยต้องอยู่ในภาพจริง ไม่ใช่แค่ไฟล์ถูกสร้าง
  const colors = await pngColors(page, await file.path());
  const tint = await page.evaluate(() => {
    const block = document.querySelector(
      '[style*="grid-column"] [style*="background-color"]',
    );
    return getComputedStyle(block).backgroundColor;
  });
  expect(colors).toContain(tint);
});

test("Exam schedule download", async ({ openApp }) => {
  const page = await openApp("page=exam");

  const file = await download(page);
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  const { width, height } = await pngColors(page, await file.path(), {
    withSize: true,
  });
  expect(width).toBeGreaterThan(200);
  expect(height).toBeGreaterThan(200);
});

test("Exam term selector during capture", async ({ openApp }) => {
  const page = await openApp("page=exam");

  // สถานะนี้มีอยู่แค่ระหว่าง capture จับด้วย MutationObserver ที่ติดไว้ก่อนกด
  await page.evaluate(() => {
    window.__capture = { sawStatic: false, sawControl: true };
    const check = () => {
      const control = document.querySelector('[aria-label="รอบสอบ"]');
      const header = document.querySelector("header");
      if (!control && header?.textContent.includes("กลางภาค")) {
        window.__capture.sawStatic = true;
      }
    };
    new MutationObserver(check).observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

  await download(page);
  const seen = await page.evaluate(() => window.__capture);

  // ระหว่างถ่าย : ไม่มี form control อยู่ในกรอบ มีแต่ชื่อรอบเป็นข้อความ
  expect(seen.sawStatic).toBe(true);
  // ถ่ายเสร็จแล้วต้องกลับมาเลือกได้เหมือนเดิม
  await expect(page.locator('[aria-label="รอบสอบ"]')).toBeVisible();
});

test("Floating controls", async ({ openApp }) => {
  for (const query of ["page=study", "page=exam"]) {
    const page = await openApp(query);
    expect(await dockOutsideFrame(page)).toBe(true);

    const inFrame = await page.evaluate(() => {
      const sheet = document.querySelector(
        '[class*="rounded-xl"][class*="border"]',
      );
      if (!sheet) {
        return "ไม่เจอกรอบ";
      }
      // ปุ่มลอยและ picker ทุกตัวต้องอยู่นอกกรอบ ไม่ใช่แค่ปุ่มดาวน์โหลด
      return [...sheet.querySelectorAll("[aria-label]")]
        .map((node) => node.getAttribute("aria-label"))
        .filter((label) =>
          ["ปีการศึกษา", "ภาคเรียน", "ปรับแต่งสีตาราง", "ดาวน์โหลดรูปภาพ"].includes(
            label,
          ),
        );
    });
    expect(inFrame).toEqual([]);
  }
});
