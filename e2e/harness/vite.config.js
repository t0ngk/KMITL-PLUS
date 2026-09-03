import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// harness ของชุด e2e : mount หน้าจริงด้วย fixture ที่ redact แล้ว
// รันเองก็ได้ (pnpm exec vite --config e2e/harness/vite.config.js) เพื่อดูด้วยตา
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
