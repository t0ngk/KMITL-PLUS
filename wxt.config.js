import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// content script ถูก build เป็นก้อนเดียวจบ ไม่มี loader shim และไม่ต้องประกาศ
// web_accessible_resources — ต่างจาก crxjs ที่ต้องมี plugin คอยแก้ manifest หลัง build
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],

  // ปิด auto-import ของ wxt : โปรเจกต์นี้เขียน import ครบทุกตัวและ lint ด้วย
  // oxlint + anti-slop ตัวแปร global ที่โผล่มาเองจะอ่านเป็นตัวไม่รู้จัก
  imports: false,

  manifest: {
    name: "KMITL +",
    description:
      "KMITL + is a chrome extension that add more features to KMITL's website.",
    icons: {
      192: "icon-192x192.png",
      256: "icon-256x256.png",
      384: "icon-384x384.png",
      512: "icon-512x512.png",
    },
  },

  vite: () => ({
    // svelte มาจาก @wxt-dev/module-svelte แต่ tailwind ไม่มี module ของ wxt
    // ต้องยก plugin มาเอง ไม่งั้น @apply ใน styles.css ไม่ถูกแปลง
    plugins: [tailwindcss()],
    build: {
      // inline woff2 ของ Prompt เป็น data URI — boot.js import fonts.css ด้วย ?inline
      // แล้ว inject เป็น <style> ใน document.head เพื่อให้ snapdom เห็น @font-face
      // ตอน export PNG ถ้าไม่ inline ฟอนต์จะถูก emit เป็นไฟล์แยกและรูปที่ได้จะไม่มี Prompt
      assetsInlineLimit: 32768,
    },
  }),
});
