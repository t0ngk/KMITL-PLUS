import { chooseOption, expect, pickerText, test } from "./fixtures";
import { pngColors } from "./png";

// ชื่อ test ตรงกับ #### Scenario: ใน openspec/specs/theme-customize/spec.md
// ตัวอักษรต่อตัวอักษร — e2e/coverage.mjs ตรวจความตรงนั้น

const TRIGGER = 'button[aria-label="ปรับแต่งสีตาราง"]';
const MENU = '[role="dialog"][aria-label="ปรับแต่งสี"]';

// สีพื้นของบล็อกทุกอัน จับคู่กับชื่อวิชาที่อยู่ในบล็อกนั้น
//
// ชื่อวิชาอยู่ใน <p> ตัวแรกของบล็อก ไม่ใช่ textContent ทั้งก้อน (ก้อนนั้นรวมเวลา
// ห้อง กลุ่ม และประเภทไว้ด้วย) และมีบล็อกที่เป็นแค่ป้ายชื่อล้นออกมา ซึ่งไม่มี <p>
const blockColorsBySubject = (page) =>
  page.evaluate(() => {
    const result = {};
    for (const block of document.querySelectorAll(
      '[style*="grid-column"] [style*="background-color"]',
    )) {
      const name = block.querySelector("p")?.textContent.trim();
      if (name) {
        (result[name] ??= []).push(getComputedStyle(block).backgroundColor);
      }
    }
    return result;
  });

const openMenu = async (page) => {
  await page.locator(TRIGGER).click();
  await expect(page.locator(MENU)).toBeVisible();
};

test("Initial coloring", async ({ openApp }) => {
  const page = await openApp("page=study");
  const bySubject = await blockColorsBySubject(page);

  const names = Object.keys(bySubject);
  expect(names.length).toBeGreaterThan(1);

  // ทุกบล็อกของวิชาเดียวกันใช้สีเดียวกัน
  for (const [name, colors] of Object.entries(bySubject)) {
    expect(new Set(colors).size, `${name} ใช้หลายสี`).toBe(1);
  }

  // วิชาต่างกันได้สีต่างกันเท่าที่ palette มี — fixture นี้มี 18 วิชาใน theme
  // ใช้ครบทั้ง 10 ช่องของ palette แต่มีวิชาหนึ่งที่ไม่มีคาบเรียน สีของมันจึงไม่
  // ปรากฏบนกริด เหลือ 9 สีบนหน้าจอ ตัวเลขนี้จะขยับทันทีถ้าการแจกสีเพี้ยน
  const distinct = new Set(names.map((name) => bySubject[name][0]));
  expect(distinct.size).toBe(9);
  expect(names.length).toBeGreaterThan(distinct.size);
});

test("Customize a subject color", async ({ openApp }) => {
  const page = await openApp("page=study");
  const subject = "SATURDAY CLASS";
  const before = (await blockColorsBySubject(page))[subject][0];

  await openMenu(page);
  await page.getByLabel(`สีวิชา ${subject}`).fill("#123456");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  const after = (await blockColorsBySubject(page))[subject][0];
  expect(after).not.toBe(before);

  // วิชาอื่นต้องไม่ขยับ
  const others = await blockColorsBySubject(page);
  expect(others["ENGLISH DAY NAME LECTURE"][0]).not.toBe(after);

  // และภาพที่ export ต้องมีสีใหม่จริง ไม่ใช่แค่หน้าจอเปลี่ยน
  const pending = page.waitForEvent("download", { timeout: 40_000 });
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  const file = await pending;
  const colors = await pngColors(page, await file.path());
  expect(colors).toContain(after);
});

test("Reset theme", async ({ openApp }) => {
  const page = await openApp("page=study");
  const subject = "SATURDAY CLASS";
  const original = (await blockColorsBySubject(page))[subject][0];
  const headerBefore = await page.getByLabel("สีหัวตาราง").count();
  expect(headerBefore).toBe(0); // ยังไม่เปิดเมนู

  await openMenu(page);
  await page.getByLabel(`สีวิชา ${subject}`).fill("#123456");
  await page.getByLabel("สีหัวตาราง").fill("#00ff00");
  await page.waitForTimeout(300);
  expect((await blockColorsBySubject(page))[subject][0]).not.toBe(original);

  await page.getByRole("button", { name: "คืนค่าสีเริ่มต้น" }).click();
  await page.waitForTimeout(300);

  // สีวิชากลับไปเป็นค่าจาก palette และหัวตารางกลับไปเป็นสีเริ่มต้น
  expect((await blockColorsBySubject(page))[subject][0]).toBe(original);
  await expect(page.getByLabel("สีหัวตาราง")).toHaveValue("#e35205");
});

test("Switch term after customizing", async ({ openApp }) => {
  const page = await openApp("page=study&term=3/2565");

  await openMenu(page);
  await page.getByLabel("สีวิชา SATURDAY CLASS").fill("#123456");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 2");

  // เทอมใหม่ต้องมีสีให้ทุกวิชา และยังแต่งได้รายวิชาเหมือนเดิม
  const bySubject = await blockColorsBySubject(page);
  expect(Object.keys(bySubject).length).toBeGreaterThan(0);
  for (const colors of Object.values(bySubject)) {
    expect(colors[0]).not.toBe("rgba(0, 0, 0, 0)");
  }

  await openMenu(page);
  for (const name of Object.keys(bySubject)) {
    await expect(page.getByLabel(`สีวิชา ${name}`)).toHaveCount(1);
  }
});

test("Escape closes the menu", async ({ openApp }) => {
  const page = await openApp("page=study");
  await openMenu(page);

  await page.keyboard.press("Escape");

  await expect(page.locator(MENU)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toBeFocused();
});

test("Clicking outside closes the menu", async ({ openApp }) => {
  const page = await openApp("page=study");

  // เล็งพิกัดของปุ่มที่ถ้าโดนกดจริงจะสลับโหมด แล้วคลิกที่พิกัดนั้นตรง ๆ
  // ต้องใช้ page.mouse ไม่ใช่ locator.click() : locator.click รอจนปุ่มรับคลิกได้
  // ซึ่งไม่มีวันเกิดเมื่อมีชั้นกันคลิกอยู่ — เราอยากจำลองคนกดตรงนั้น ไม่ใช่กดที่ปุ่ม
  const box = await page.getByRole("button", { name: "แบบเดิม" }).boundingBox();
  await openMenu(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);

  await expect(page.locator(MENU)).toHaveCount(0);
  // คลิกนั้นต้องไม่ทะลุไปกดปุ่ม : ยังอยู่โหมดใหม่ ป้ายปุ่มยังเป็น "แบบเดิม"
  await expect(page.getByRole("button", { name: "แบบเดิม" })).toBeVisible();
  await expect(page.locator(".kmitl-table")).toHaveCount(0);
});

test("Keyboard reaches the menu contents", async ({ openApp }) => {
  const page = await openApp("page=study");

  await page.locator(TRIGGER).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(MENU)).toBeVisible();

  const inside = () =>
    page.evaluate(
      (selector) =>
        Boolean(document.querySelector(selector)?.contains(document.activeElement)),
      MENU,
    );

  const controls = await page.locator(`${MENU} input, ${MENU} button`).count();
  expect(controls).toBeGreaterThan(1);

  // ไล่ Tab ให้ครบจำนวน control : ต้องแตะได้ทุกตัวและ focus ต้องไม่หลุดออกนอกเมนู
  const reached = new Set();
  for (let step = 0; step < controls + 1; step += 1) {
    await page.keyboard.press("Tab");
    expect(await inside(), `focus หลุดออกนอกเมนูที่ Tab ครั้งที่ ${step + 1}`).toBe(
      true,
    );
    reached.add(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ??
          document.activeElement?.textContent.trim(),
      ),
    );
  }
  expect(reached).toContain("สีหัวตาราง");
  expect(reached).toContain("คืนค่าสีเริ่มต้น");
});

test("Menu state is announced", async ({ openApp }) => {
  const page = await openApp("page=study");

  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-expanded", "false");

  await openMenu(page);
  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-expanded", "true");
  // เมนูถูกประกาศเป็นภูมิภาคเดียวที่มีชื่อ ไม่ใช่เนื้อหาลอย ๆ
  await expect(page.locator(MENU)).toHaveCount(1);
  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-haspopup", "dialog");

  await page.keyboard.press("Escape");
  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-expanded", "false");
});

test("Choosing a term without a mouse", async ({ openApp }) => {
  const page = await openApp("page=study");

  await page.getByLabel("ภาคเรียน").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();

  await page.getByRole("option", { name: "ภาคเรียนที่ 1", exact: true }).waitFor();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1300);

  // ผลต้องเหมือนกับเลือกด้วยเมาส์ทุกประการ
  expect(await pickerText(page, "ภาคเรียน")).toBe("ภาคเรียนที่ 1");
  await expect(page.getByText("ไม่มีข้อมูลภาคเรียนนี้")).toBeVisible();
});

test("Pickers are unavailable while a term is loading", async ({ openApp }) => {
  const page = await openApp("page=study&slow=1500");

  await page.getByLabel("ภาคเรียน").click();
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: "ภาคเรียนที่ 1", exact: true }).click();
  await page.waitForTimeout(300);

  // บอกด้วยมากกว่าสี : data-disabled ที่ AT อ่านได้ ไม่ใช่แค่จางลง
  for (const label of ["ปีการศึกษา", "ภาคเรียน"]) {
    await expect(page.getByLabel(label)).toHaveAttribute("data-disabled", "");
  }
  await expect(page.getByText("กำลังโหลด…")).toBeVisible();

  await page.waitForTimeout(1800);
  for (const label of ["ปีการศึกษา", "ภาคเรียน"]) {
    await expect(page.getByLabel(label)).not.toHaveAttribute("data-disabled", "");
  }
});
