import { downloadAs, downloadPortrait, expect, test } from "./fixtures";
import { pngBands, pngColors } from "./png";

// ชื่อ test ตรงกับ #### Scenario: ใน openspec/specs/image-export/spec.md
// ตัวอักษรต่อตัวอักษร — e2e/coverage.mjs ตรวจความตรงนั้น

// dock ต้องอยู่นอกกรอบ capture เสมอ — กรอบคือแผ่นตาราง ไม่ใช่ทั้งหน้า
const dockOutsideFrame = (page) =>
  page.evaluate(() => {
    const sheet = document.querySelector('[class*="rounded-xl"][class*="border"]');
    const dock = document.querySelector('[aria-label="ดาวน์โหลดรูปภาพ"]');
    return Boolean(sheet && dock && !sheet.contains(dock));
  });

test("Study table download", async ({ openApp }) => {
  const page = await openApp("page=study");

  const file = await downloadAs(page);
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

  const file = await downloadAs(page);
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

  await downloadAs(page);
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

// --- wallpaper-export : ภาพแนวตั้ง -------------------------------------------

test("Formats are offered before downloading", async ({ openApp }) => {
  const page = await openApp("page=study");
  let downloads = 0;
  page.on("download", () => (downloads += 1));

  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();

  const menu = page.getByRole("dialog", { name: "รูปแบบภาพ" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("radio", { name: "แนวนอน", exact: true })).toBeVisible();
  await expect(menu.getByRole("radio", { name: "แนวตั้ง", exact: true })).toBeVisible();
  // เปิดเมนูเฉย ๆ ต้องไม่โหลดอะไรเลย
  await page.waitForTimeout(600);
  expect(downloads).toBe(0);
});

test("One way to start a download", async ({ openApp }) => {
  const page = await openApp("page=study");
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  const menu = page.getByRole("dialog", { name: "รูปแบบภาพ" });
  await menu.waitFor();

  // ปุ่มที่กดแล้วเกิดการดาวน์โหลดมีอันเดียว ไม่ว่าจะเลือกรูปแบบไหน
  await expect(menu.getByRole("button")).toHaveCount(1);
  await expect(
    menu.getByRole("button", { name: "ดาวน์โหลด", exact: true }),
  ).toBeVisible();

  await menu.getByRole("radio", { name: "แนวนอน", exact: true }).check();
  await expect(menu.getByRole("button")).toHaveCount(1);
  // แนวนอนไม่มีตัวเลือกของตัวเอง จึงไม่มีสวิตช์โผล่ค้างไว้
  await expect(menu.getByLabel("เว้นที่ให้นาฬิกา")).toHaveCount(0);
});

test("Portrait study table", async ({ openApp }) => {
  const page = await openApp("page=study&fixture=typical");
  const onScreen = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '[style*="grid-column"] [style*="background-color"] p:first-child',
      ),
    ].map((node) => node.textContent.trim()),
  );

  const file = await downloadPortrait(page);
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  const { width, height } = await pngBands(page, await file.path());
  expect({ width, height }).toEqual({ width: 1080, height: 2520 });

  // ผืนภาพเดียวกันที่ harness เปิดให้ดูได้ : ต้องมีวิชาชุดเดียวกับที่อยู่บนจอ
  const sheet = await openApp("page=study&fixture=typical&export=portrait");
  const inImage = await sheet.evaluate(() =>
    [...document.querySelectorAll("div")]
      .filter((node) => node.style.backgroundColor && node.querySelector("p"))
      .map((node) => node.querySelector("p").textContent.trim()),
  );
  expect(new Set(inImage)).toEqual(new Set(onScreen));

  // และวางตรงตำแหน่งตามเวลาจริงด้วย ไม่ใช่แค่มีวิชาครบ — 09:00-12:00 บนแกนที่
  // ตัดเหลือเริ่ม 09:00 ช่องละ 15 นาที และแถว 1 เป็นชื่อวัน => เส้น 2 ถึง 14
  const placed = await sheet.evaluate(() => {
    const node = [...document.querySelectorAll("div")].find(
      (item) =>
        item.style.backgroundColor &&
        item.textContent.includes("INFORMATION SYSTEMS ANALYSIS AND DESIGN"),
    );
    return getComputedStyle(node.parentElement).gridRow;
  });
  expect(placed).toBe("2 / 14");
});

test("Portrait exam schedule", async ({ openApp }) => {
  const page = await openApp("page=exam");
  const file = await downloadPortrait(page);
  const { width, height } = await pngBands(page, await file.path());
  expect({ width, height }).toEqual({ width: 1080, height: 2520 });
});

test("The image is never cropped along its width", async ({ openApp }) => {
  const page = await openApp("page=study");
  const file = await downloadPortrait(page);
  const { ratio } = await pngBands(page, await file.path());

  // รูปต้องสูงกว่าโทรศัพท์ทุกรุ่น -> อัตราส่วน กว้าง/สูง ต้องน้อยกว่าของจอ
  // iPhone 19.5:9 = 0.4615 · Android 20:9 = 0.45
  expect(ratio).toBeLessThan(9 / 20);
  expect(ratio).toBeLessThan(9 / 19.5);
  expect(ratio).toBeCloseTo(9 / 21, 3);
});

test("Reserved bands", async ({ openApp }) => {
  const page = await openApp("page=study");
  const file = await downloadPortrait(page, { reserve: true });
  const bands = await pngBands(page, await file.path());

  // ว่างจริง = ทั้งแถบเป็นสีเดียว ไม่ใช่แค่ดูเหมือนว่าง
  expect(bands.topColors).toBe(1);
  expect(bands.bottomColors).toBe(1);
});

test("Full canvas", async ({ openApp }) => {
  const page = await openApp("page=study");
  const file = await downloadPortrait(page, { reserve: false });
  const bands = await pngBands(page, await file.path());

  expect(bands.width).toBe(1080);
  expect(bands.height).toBe(2520);
  // ไม่มีแถบว่างแล้ว ตารางกินถึงขอบบนและขอบล่าง
  expect(bands.topColors).toBeGreaterThan(1);
  expect(bands.bottomColors).toBeGreaterThan(1);
});

test("Content-fitted extent", async ({ openApp }) => {
  const page = await openApp("page=study&fixture=typical&export=portrait");

  // เบราว์เซอร์ยุบ grid-column/grid-row เป็น grid-area — เลือกด้วยข้อความแทน
  const grid = await page.evaluate(() => {
    const node = document.querySelector('[style*="grid-template-columns"]');
    const hours = [...document.querySelectorAll("div")]
      .filter(
        (cell) =>
          cell.children.length === 0 && /^\d{2}:00$/.test(cell.textContent.trim()),
      )
      .map((cell) => cell.textContent.trim());
    return { columns: getComputedStyle(node).gridTemplateColumns, hours };
  });

  // เทอมนี้เรียน 09:00-18:00 จ. _ พ. พฤ. ศ. -> ไม่มี 08:00 ไม่มีเสาร์อาทิตย์
  expect(grid.hours[0]).toBe("09:00");
  expect(grid.hours.at(-1)).toBe("17:00");
  // คอลัมน์เวลา + 4 วันที่มีเรียน (อังคารว่าง ถูกตัดออกไปด้วย)
  expect(grid.columns.split(" ")).toHaveLength(5);
});

test("An unused day inside the week", async ({ openApp }) => {
  const page = await openApp("page=study&fixture=typical&export=portrait");

  const columns = await page.evaluate(() => {
    const node = document.querySelector('[style*="grid-template-columns"]');
    return getComputedStyle(node)
      .gridTemplateColumns.split(" ")
      .map((value) => Math.round(parseFloat(value)));
  });
  const days = await page.evaluate(() =>
    [...document.querySelectorAll("div")]
      .filter(
        (node) =>
          node.children.length === 0 &&
          /^(จ|อ|พ|พฤ|ศ|ส|อา)\.$/.test(node.textContent.trim()),
      )
      .map((node) => node.textContent.trim()),
  );

  // อังคารว่าง ถูกตัดออกไปแล้ว — ที่บอกว่าข้ามวันไหนคือชื่อวันบนคอลัมน์ที่เหลือ
  expect(days).not.toContain("อ.");
  expect(days).toEqual(["จ.", "พ.", "พฤ.", "ศ."]);
  // และคอลัมน์ที่เหลือกว้างเท่ากันหมด ไม่มีคอลัมน์แคบ ๆ ที่ว่างเปล่าอีก
  const dayColumns = columns.slice(1);
  expect(new Set(dayColumns).size).toBe(1);
});

test("Extent does not apply to the exam schedule", async ({ openApp }) => {
  const page = await openApp("page=exam");
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();

  await expect(page.getByLabel("เว้นที่ให้นาฬิกา")).toBeVisible();
  await expect(page.getByLabel("ตัดวันและเวลาที่ไม่มีเรียน")).toHaveCount(0);
});

// --- fix-portrait-legibility -------------------------------------------------

// ข้อความในบล็อกอ่านได้เท่าไหร่ : เทียบกับชื่อที่ scrape มา ไม่ได้นับตัวอักษร
const blockText = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("div")]
      .filter((node) => node.style.backgroundColor && node.querySelector("p"))
      .map((node) => {
        const paragraphs = [...node.querySelectorAll("p")];
        const name = paragraphs[0];
        return {
          name: name.textContent.trim(),
          nameShown: name.clientWidth,
          nameNeeded: name.scrollWidth,
          meta: paragraphs[1]?.textContent.replace(/\s+/g, " ").trim() ?? "",
          metaClipped: paragraphs[1]
            ? paragraphs[1].scrollHeight > paragraphs[1].clientHeight + 1
            : false,
          hours: Math.round(node.parentElement.getBoundingClientRect().height / 58),
          // ความกว้างของ wrapper บอกว่าแบ่ง lane กันกี่ชั้น (100% / lanes)
          lanes: Math.round(
            100 / Number.parseFloat(node.parentElement.style.width),
          ),
        };
      }),
  );

test("Subject names read as words", async ({ openApp }) => {
  const page = await openApp("page=study&export=portrait");
  const blocks = await blockText(page);

  // คาบตั้งแต่สองชั่วโมงขึ้นไปต้องได้ชื่อครบ ไม่ใช่เศษไม่กี่ตัวอักษร
  const longEnough = blocks.filter((block) => block.hours >= 2);
  expect(longEnough.length).toBeGreaterThan(2);
  for (const block of longEnough) {
    expect(block.nameShown, `${block.name} ไม่มีที่ให้ชื่อเลย`).toBeGreaterThan(0);
  }

  // ตัวอย่างที่วัดได้ : ชื่อยาวปานกลางต้องครบทั้งไทยและอังกฤษ
  const named = (text) => blocks.find((block) => block.name.startsWith(text));
  expect(named("SOFTWARE VERIFICATION").nameNeeded).toBeLessThanOrEqual(
    named("SOFTWARE VERIFICATION").nameShown + 1,
  );
  expect(named("การเขียนโปรแกรมบนเว็บ").nameNeeded).toBeLessThanOrEqual(
    named("การเขียนโปรแกรมบนเว็บ").nameShown + 1,
  );
});

test("Room and section survive", async ({ openApp }) => {
  const page = await openApp("page=study&export=portrait");
  const blocks = await blockText(page);

  // ไม่รวมบล็อกที่ซ้อนกันตั้งแต่ 3 ชั้น — คอลัมน์แคบจนใส่ได้อย่างเดียว
  // และสิ่งที่เลือกใส่คือชื่อวิชา (ดู scenario ถัดไป)
  const longEnough = blocks.filter((block) => block.hours >= 2 && block.lanes <= 2);
  expect(longEnough.length).toBeGreaterThan(2);
  for (const block of longEnough) {
    expect(block.meta, `${block.name} ไม่มีบรรทัดเวลา/ห้อง`).not.toBe("");
    expect(block.metaClipped, `${block.name} บรรทัดเวลา/ห้องถูกตัด`).toBe(false);
    // เวลา ห้อง และกลุ่มอยู่ในบรรทัดเดียวกัน
    expect(block.meta).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
    expect(block.meta).toMatch(/\(\S\)$/);
  }
});

test("The name comes first when only one thing fits", async ({ openApp }) => {
  const page = await openApp("page=study&export=portrait");
  const blocks = await blockText(page);

  // fixture มีคาบซ้อนกันสามชั้นไว้เป็นเคสนี้ (corpus จริงไม่มีคาบซ้อนกันเลย)
  const crowded = blocks.filter((block) => block.lanes >= 3);
  expect(crowded.length).toBeGreaterThan(0);
  for (const block of crowded) {
    expect(block.nameShown, `${block.name} ไม่เหลือที่ให้ชื่อ`).toBeGreaterThan(0);
    expect(block.meta, `${block.name} ยังใส่รายละเอียดทั้งที่ไม่มีที่`).toBe("");
  }
});

test("A class too short to label", async ({ openApp }) => {
  const page = await openApp("page=study&export=portrait");
  const blocks = await blockText(page);

  // fixture มีคาบ 15 นาทีไว้เป็นเคสนี้โดยเฉพาะ
  const short = blocks.find((block) => block.name.startsWith("FIFTEEN MINUTE"));
  expect(short).toBeDefined();
  // ชื่อยาวกว่าที่แสดงได้ = ถูกตัด ซึ่งยอมรับ แต่บล็อกต้องยังมีตัวตนและมีสีของมัน
  expect(short.nameNeeded).toBeGreaterThan(short.nameShown);
  const visible = await page.evaluate(() => {
    const node = [...document.querySelectorAll("div")].find(
      (item) =>
        item.style.backgroundColor &&
        item.textContent.includes("FIFTEEN MINUTE"),
    );
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height, tint: node.style.backgroundColor };
  });
  expect(visible.width).toBeGreaterThan(0);
  expect(visible.height).toBeGreaterThan(0);
  expect(visible.tint).not.toBe("");
});

test("Nothing identifies the student", async ({ openApp }) => {
  for (const query of [
    "page=study&export=portrait",
    "page=exam&export=portrait",
  ]) {
    const page = await openApp(query);
    const text = await page.evaluate(() => document.body.innerText);
    for (const word of [
      "รหัสนักศึกษา",
      "ชื่อ",
      "คณะ",
      "ภาควิชา",
      "สาขาวิชา",
      "65010500",
    ]) {
      expect(text, `${query} ยังมี "${word}"`).not.toContain(word);
    }
  }
});

test("The term is still stated", async ({ openApp }) => {
  for (const query of [
    "page=study&export=portrait",
    "page=exam&export=portrait",
  ]) {
    const page = await openApp(query);
    const text = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " "),
    );
    expect(text, query).toMatch(/ภาคเรียนที่ \d/);
    expect(text, query).toMatch(/ปีการศึกษา \d{4}/);
  }
});

test("The landscape export is unchanged", async ({ openApp }) => {
  const page = await openApp("page=study");

  // ภาพแนวนอนยังมีหัวตารางเต็มรวมรหัสและชื่อ — เป็นภาพที่เก็บไว้ดูเอง
  const inFrame = await page.evaluate(() => {
    const sheet = document.querySelector('[class*="rounded-xl"][class*="border"]');
    return sheet.innerText.replace(/\s+/g, " ");
  });
  expect(inFrame).toContain("รหัสนักศึกษา");
  expect(inFrame).toContain("คณะ");

  const file = await downloadAs(page, "แนวนอน");
  const { width, height } = await pngBands(page, await file.path());
  expect({ width, height }).toEqual({ width: 2784, height: 1592 });
});

// --- ที่ไม่ผูกกับ scenario : กลไกของการถ่ายนอกจอ --------------------------------

test("ผืนภาพนอกจอถูกลบหลังถ่ายเสร็จ", async ({ openApp }) => {
  const page = await openApp("page=study");
  const before = await page.evaluate(() => document.body.children.length);

  await downloadPortrait(page);
  await page.waitForTimeout(600);

  expect(await page.evaluate(() => document.body.children.length)).toBe(before);
  // ไม่มีของเต็มจอค้างไว้ให้ไปโผล่ในภาพครั้งถัดไป
  expect(
    await page.evaluate(
      () => document.querySelectorAll('[style*="left: -10000px"]').length,
    ),
  ).toBe(0);
});

test("ผืนภาพนอกจอถูกลบแม้ตอนถ่ายพัง", async ({ openApp }) => {
  const page = await openApp("page=study");
  const before = await page.evaluate(() => document.body.children.length);

  // ทำให้ snapdom ล้มกลางทาง : ทางที่ finally ต้องเก็บกวาดให้
  await page.evaluate(() => {
    const boom = () => {
      throw new Error("ทดสอบ : rasterize พัง");
    };
    HTMLCanvasElement.prototype.toDataURL = boom;
    HTMLCanvasElement.prototype.toBlob = boom;
  });

  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();
  await page.getByRole("radio", { name: "แนวตั้ง", exact: true }).check();
  await page.getByRole("button", { name: "ดาวน์โหลด", exact: true }).click();
  await page.waitForTimeout(1500);

  expect(await page.evaluate(() => document.body.children.length)).toBe(before);
});

test("ผืนภาพนอกจอแตะไม่ได้ระหว่างที่มีตัวตน", async ({ openApp }) => {
  const page = await openApp("page=study");

  // ผืนภาพมีตัวตนแค่ชั่วครู่ระหว่างถ่าย — ต้องดักด้วย observer ก่อนกด
  await page.evaluate(() => {
    window.__host = null;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.style?.left === "-10000px") {
            window.__host = {
              ariaHidden: node.getAttribute("aria-hidden"),
              inert: node.inert,
              pointerEvents: node.style.pointerEvents,
              focusable: node.querySelectorAll(
                "a[href], button, input, select, textarea, [tabindex]",
              ).length,
            };
          }
        }
      }
    }).observe(document.body, { childList: true });
  });

  await downloadPortrait(page);
  const host = await page.evaluate(() => window.__host);

  expect(host).not.toBeNull();
  expect(host.ariaHidden).toBe("true");
  expect(host.inert).toBe(true);
  expect(host.pointerEvents).toBe("none");
  expect(host.focusable).toBe(0);
});

test("ฟอนต์ Prompt อยู่ในผืนภาพแนวตั้ง", async ({ openApp }) => {
  const page = await openApp("page=study&export=portrait");

  const font = await page.evaluate(() => {
    const block = [...document.querySelectorAll("div")].find(
      (node) => node.style.backgroundColor && node.querySelector("p"),
    );
    return getComputedStyle(block.querySelector("p")).fontFamily;
  });
  expect(font).toContain("Prompt");
});

test("สวิตช์ของภาพแนวตั้งจำไว้ในหน้านี้", async ({ openApp }) => {
  const page = await openApp("page=study");

  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();
  await page.getByLabel("เว้นที่ให้นาฬิกา").setChecked(false);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();
  await expect(page.getByLabel("เว้นที่ให้นาฬิกา")).not.toBeChecked();

  // แต่ไม่ได้เขียนไว้ที่ไหนที่อยู่ข้ามรอบ
  const stored = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
  }));
  expect(stored).toEqual({ local: 0, session: 0 });
});

test("เมนูรูปแบบอยู่นอกกรอบ capture", async ({ openApp }) => {
  const page = await openApp("page=study");
  await page.getByLabel("ดาวน์โหลดรูปภาพ").click();
  await page.getByRole("dialog", { name: "รูปแบบภาพ" }).waitFor();

  const inside = await page.evaluate(() => {
    const sheet = document.querySelector(
      '[class*="rounded-xl"][class*="border"]',
    );
    const menu = document.querySelector('[role="dialog"][aria-label="รูปแบบภาพ"]');
    return Boolean(sheet && menu && sheet.contains(menu));
  });
  expect(inside).toBe(false);
});
