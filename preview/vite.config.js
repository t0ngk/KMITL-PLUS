import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// preview harness เท่านั้น : mount หน้าตารางเรียนด้วยข้อมูลตัวอย่างเพื่อถ่ายภาพตรวจงาน
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^\.\.\/\.\.\/services\/reg$/,
        replacement: fileURLToPath(new URL("./regStub.js", import.meta.url)),
      },
    ],
  },
  server: { port: 5199 },
});
