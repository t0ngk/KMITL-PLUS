import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

// e2e ของโปรเจกต์นี้เดิน scenario ใน openspec/specs — 1 capability = 1 ไฟล์,
// 1 scenario = 1 test, ชื่อ test ตรงกับ #### Scenario: ตัวอักษรต่อตัวอักษร
// (adopt-e2e-suite design decision 2) ความตรงนั้นคือสิ่งที่ e2e/coverage.mjs ตรวจ
//
//   pnpm e2e                        ทั้งสอง project
//   pnpm e2e --project=preview      ลูปเร็ว ไม่ต้อง build
//   pnpm e2e --grep "Reset theme"   scenario เดียว
//   pnpm e2e:coverage               สเปกไหนยังไม่มีเทสต์ (ไม่เปิด browser)

export const PREVIEW_PORT = 5299;

export default defineConfig({
  testDir: fileURLToPath(new URL("./e2e", import.meta.url)),
  // เดิน scenario ตามลำดับในไฟล์ แต่ไฟล์ต่างกันขนานกันได้
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    viewport: { width: 1440, height: 900 },
    // trace ตอนตกคือสิ่งที่ walk เดิมไม่มี — ตกแล้วไม่เหลืออะไรให้ดูย้อน
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // preview server ตัวเดียวใช้ร่วมกัน : project extension ไม่ได้ใช้ แต่ค่าใช้จ่าย
  // ในการปล่อยให้ขึ้นน้อยกว่าการแยก config สองไฟล์แล้วต้องดูแลสองที่
  webServer: {
    command: `node node_modules/vite/bin/vite.js --config e2e/harness/vite.config.js --port ${PREVIEW_PORT} --strictPort`,
    url: `http://localhost:${PREVIEW_PORT}/app.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: "preview",
      testIgnore: /extension\.spec\.js/,
      use: { baseURL: `http://localhost:${PREVIEW_PORT}` },
    },
    {
      // ต้อง pnpm build ก่อน : fixture จะปฏิเสธถ้าไม่มี .output/chrome-mv3
      // แยกเป็น project เพราะช้ากว่ามาก และวันหนึ่งอาจรันบน CI คนละแบบ
      name: "extension",
      testMatch: /extension\.spec\.js/,
    },
  ],
});
