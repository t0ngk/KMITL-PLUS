import {
  chooseOption,
  expect,
  flat,
  legacyRowCount,
  pickerText,
  subjectBlocks,
  termPill,
  test,
  toLegacy,
  toRedesign,
} from "./fixtures";

// ชื่อ test ตรงกับ #### Scenario: ใน openspec/specs/study-table-render/spec.md
// ตัวอักษรต่อตัวอักษร — e2e/coverage.mjs ตรวจความตรงนั้น

const headerLine = async (page, startsWith) =>
  flat(
    await page.evaluate(
      (prefix) =>
        [...document.querySelectorAll("p")]
          .map((node) => node.textContent)
          .find((text) => text.trim().startsWith(prefix)) ?? "",
      startsWith,
    ),
  );

// ชื่อวันของแถวที่มีวิชานั้นอยู่ — คอลัมน์แรกของแถวใน subgrid
const dayLabelOf = (page, subjectName) =>
  page.evaluate((name) => {
    const block = [...document.querySelectorAll("div")].find(
      (node) => node.textContent.trim().startsWith(name) && node.style.gridColumn,
    );
    const row = block?.closest("[style*='grid-column: 1 / -1']");
    return row?.firstElementChild?.textContent.trim() ?? "ไม่เจอ";
  }, subjectName);

test("Normal page load", async ({ openApp, consoleErrors }) => {
  const page = await openApp("page=study");

  await expect(subjectBlocks(page)).not.toHaveCount(0);
  // บล็อกต้องบอกชื่อวิชา เวลา ห้อง/อาคาร กลุ่ม และประเภท (ท/ป)
  const block = subjectBlocks(page).filter({
    hasText: "SOFTWARE VERIFICATION AND VALIDATION",
  });
  await expect(block).toHaveCount(1);
  await expect(block).toContainText("–");
  await expect(block).toContainText("(ท)");

  // ตำแหน่งต้องตรงกับเวลาจริง ไม่ใช่แค่ "มีบล็อกอยู่" — 09:00-12:00 บนแกนที่เริ่ม
  // 08:00 ช่องละ 15 นาที และคอลัมน์ 1 เป็นชื่อวัน => เส้น 6 ถึง 18
  const placed = await page.evaluate(() => {
    const node = [...document.querySelectorAll("div")].find(
      (item) =>
        item.style.backgroundColor &&
        item.textContent.includes("SOFTWARE VERIFICATION AND VALIDATION"),
    );
    return getComputedStyle(node.parentElement).gridColumn;
  });
  expect(placed).toBe("6 / 18");
  expect(consoleErrors).toEqual([]);
});

test("Both Thai and English day names", async ({ openApp }) => {
  const page = await openApp("page=study");

  // fixture มีทั้งวิชาที่ reg เขียนวันเป็นไทยและเป็นอังกฤษ ทั้งคู่ต้องลงแถวถูก
  await expect(page.getByText("ENGLISH DAY NAME LECTURE")).toBeVisible();
  expect(await dayLabelOf(page, "ENGLISH DAY NAME LECTURE")).not.toBe("ไม่เจอ");
  expect(await dayLabelOf(page, "SOFTWARE VERIFICATION AND VALIDATION")).not.toBe(
    "ไม่เจอ",
  );
});

test("Sparse or empty page", async ({ openApp }) => {
  const page = await openApp("page=study");
  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 1");

  await expect(page.getByText("ไม่มีข้อมูลภาคเรียนนี้")).toBeVisible();
  await expect(subjectBlocks(page)).toHaveCount(0);
});

test("Header render", async ({ openApp }) => {
  const page = await openApp("page=study");

  expect(await headerLine(page, "รหัสนักศึกษา")).toMatch(
    /^รหัสนักศึกษา \S+ ชื่อ \S/,
  );
  expect(await headerLine(page, "คณะ")).toContain("คณะ");
  expect(await termPill(page)).toBe("ประจำภาคเรียนที่ 2 ปีการศึกษา 2566");
});

test("Toggle old design", async ({ openApp }) => {
  const page = await openApp("page=study");
  const blocks = await subjectBlocks(page).count();

  await toLegacy(page);
  expect(await legacyRowCount(page)).toBeGreaterThan(0);

  await toRedesign(page);
  await expect(subjectBlocks(page)).toHaveCount(blocks);
});

test("Toggle old design after switching term", async ({ openApp }) => {
  const page = await openApp("page=study");

  await toLegacy(page);
  const before = await legacyRowCount(page);
  await toRedesign(page);

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 1");
  await expect(page.getByText("ไม่มีข้อมูลภาคเรียนนี้")).toBeVisible();

  await toLegacy(page);
  // HTML ดิบต้องเป็นของเทอมที่กำลังดูอยู่ ไม่ใช่ของเทอมที่โหลดมาตอนเปิดหน้า
  expect(await legacyRowCount(page)).not.toBe(before);
});

test("Picker agrees with the header", async ({ openApp }) => {
  const page = await openApp("page=study");

  expect(await termPill(page)).toBe("ประจำภาคเรียนที่ 2 ปีการศึกษา 2566");
  expect(await pickerText(page, "ปีการศึกษา")).toBe("ปีการศึกษา 2566");
  expect(await pickerText(page, "ภาคเรียน")).toBe("ภาคเรียนที่ 2");
});

test("The lists come from the registrar", async ({ openApp }) => {
  const page = await openApp("page=study");

  await page.getByLabel("ภาคเรียน").click();
  await page.waitForTimeout(350);
  const semesters = await page.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  await page.getByLabel("ปีการศึกษา").click();
  await page.waitForTimeout(350);
  const years = await page.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");

  // term-selector.html คือหน้าเลือกเทอมของ reg ตัวจริง : ปี 2567-2564 ภาคเรียน 2, 1
  // ไม่มีอะไรถูกเติมเข้ามาเอง — โดยเฉพาะภาคฤดูร้อนที่ reg ไม่ได้เสนอ
  expect(years).toEqual([
    "ปีการศึกษา 2567",
    "ปีการศึกษา 2566",
    "ปีการศึกษา 2565",
    "ปีการศึกษา 2564",
  ]);
  expect(semesters).toEqual(["ภาคเรียนที่ 2", "ภาคเรียนที่ 1"]);
});

test("Neither list can be read", async ({ openApp }) => {
  const page = await openApp("page=study&terms=empty");

  // หน้าเลือกเทอมอ่านได้แต่ไม่มี option เลย -> ไม่มี picker
  await expect(page.getByLabel("ปีการศึกษา")).toHaveCount(0);
  await expect(page.getByLabel("ภาคเรียน")).toHaveCount(0);
  // ตารางที่แสดงอยู่ยังใช้งานได้ตามปกติ
  await expect(subjectBlocks(page)).not.toHaveCount(0);
  await expect(page.getByLabel("ดาวน์โหลดรูปภาพ")).toBeVisible();
});

test("Arriving on a term the registrar does not list", async ({ openApp }) => {
  const page = await openApp("page=study&term=3/2565");

  // ภาค 3 ไม่มีในรายการของ reg และ 2565 ไม่ใช่ปีล่าสุด — picker ต้องบอกตามหน้า
  expect(await pickerText(page, "ปีการศึกษา")).toBe("ปีการศึกษา 2565");
  expect(await pickerText(page, "ภาคเรียน")).toBe("ภาคเรียนที่ 3");
});

test("Changing only the semester keeps the year", async ({ openApp }) => {
  const page = await openApp("page=study&term=3/2565");

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 2");

  expect(await pickerText(page, "ปีการศึกษา")).toBe("ปีการศึกษา 2565");
  expect(await pickerText(page, "ภาคเรียน")).toBe("ภาคเรียนที่ 2");
});

test("The term cannot be read", async ({ openApp }) => {
  const page = await openApp("page=study&header=broken");
  const fetches = [];
  page.on("request", (request) => {
    if (request.url().includes("/fixtures/study")) {
      fetches.push(request.url());
    }
  });

  expect(await pickerText(page, "ปีการศึกษา")).toBe("เลือกปีการศึกษา");
  expect(await pickerText(page, "ภาคเรียน")).toBe("เลือกภาคเรียน");
  await expect(subjectBlocks(page)).not.toHaveCount(0);

  // เลือกข้างเดียวยังยิงไม่ได้ — ยิงตอนนี้จะได้เทอมที่ไม่มีใครขอ
  await chooseOption(page, "ปีการศึกษา", "ปีการศึกษา 2566");
  expect(fetches).toHaveLength(0);

  await chooseOption(page, "ภาคเรียน", "ภาคเรียนที่ 1");
  expect(fetches).toHaveLength(1);
  expect(await termPill(page)).toBe("ประจำภาคเรียนที่ 1 ปีการศึกษา 2566");
});

test("Non-breaking spaces separate the columns", async ({ openApp }) => {
  const page = await openApp("page=study");

  // reg คั่นคอลัมน์ด้วย &nbsp; 3-5 ตัว และคั่น label กับค่าด้วยตัวเดียว
  // ถ้าแยกไม่ออก ทั้งบรรทัดจะไปกองอยู่ที่ฟิลด์แรกและอีกฟิลด์จะว่าง
  expect(await headerLine(page, "คณะ")).toBe(
    "คณะเทคโนโลยีสารสนเทศ · ภาควิชา เทคโนโลยีสารสนเทศ · สาขาวิชา เทคโนโลยีสารสนเทศ",
  );
  expect(await termPill(page)).toBe("ประจำภาคเรียนที่ 2 ปีการศึกษา 2566");
});

test("Every header field carries a value", async ({ openApp }) => {
  const page = await openApp("page=study");

  // major กับ studentName เคยว่างทุกหน้าโดยไม่มีใครเห็น เพราะฟิลด์แรกอุ้มทั้งประโยคไว้
  const context = await headerLine(page, "คณะ");
  expect(context.split(" · ")).toHaveLength(3);
  for (const part of context.split(" · ")) {
    expect(part.trim().length).toBeGreaterThan(0);
  }

  const identity = await headerLine(page, "รหัสนักศึกษา");
  expect(identity).toMatch(/^รหัสนักศึกษา \S+ ชื่อ \S+/);
});
