import fs from "node:fs/promises";

import {
  BOTTOM_BAND,
  CANVAS_HEIGHT,
  TOP_BAND,
} from "../src/shared/exportCanvas.js";

// อ่านสีจริงในไฟล์ PNG ที่ดาวน์โหลดมา
//
// ไม่มี decoder ฝั่ง node ในโปรเจกต์นี้ และไม่อยากเพิ่มแค่เรื่องนี้ จึงส่ง byte
// กลับเข้า browser แล้วให้ canvas ถอดให้ — เป็นทางเดียวที่ scenario
// "the export reflects the new color" ถูกตรวจจริง ไม่ใช่ตรวจว่ามีไฟล์ออกมา
//
// คืน array ของสีที่พบ (rgb(r, g, b) แบบเดียวกับ getComputedStyle) เรียงตามความถี่
export async function pngColors(page, filePath, { withSize = false } = {}) {
  const base64 = (await fs.readFile(filePath)).toString("base64");

  return page.evaluate(
    async ({ data, wantSize }) => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("โหลด PNG ที่ดาวน์โหลดมาไม่ได้"));
        image.src = `data:image/png;base64,${data}`;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const pixels = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data;

      const counts = new Map();
      // ทุก 4 พิกเซล : ภาพ export ใหญ่ นับทุกพิกเซลช้าโดยไม่ได้อะไรเพิ่ม
      for (let index = 0; index < pixels.length; index += 16) {
        const key = `rgb(${pixels[index]}, ${pixels[index + 1]}, ${pixels[index + 2]})`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const colors = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);

      return wantSize
        ? { colors, width: canvas.width, height: canvas.height }
        : colors;
    },
    { data: base64, wantSize: withSize },
  );
}

/**
 * ขนาดของ PNG และจำนวนสีที่พบในแถบบน/ล่าง
 *
 * ใช้ตรวจว่าแถบที่เว้นไว้ "ว่างจริง" — ว่างแปลว่าทั้งแถบเป็นสีเดียว ไม่ใช่แค่
 * ดูเหมือนว่างตอนมองภาพ
 */
export async function pngBands(page, filePath, { top, bottom } = {}) {
  // สัดส่วนแถบมาจากค่าคงที่ของโค้ดโดยตรง เทสต์จะได้ตามไปเองเมื่อแถบถูกปรับ
  // (เคยฝังไว้เป็น 0.2/0.14 แล้วพอย้ายตารางลง เทสต์ไปสุ่มสีในตารางแทนที่จะเป็นแถบ)
  const topRatio = top ?? (TOP_BAND / CANVAS_HEIGHT) * 0.9;
  const bottomRatio = bottom ?? (BOTTOM_BAND / CANVAS_HEIGHT) * 0.9;
  const base64 = (await fs.readFile(filePath)).toString("base64");

  return page.evaluate(
    async ({ data, topPart, bottomPart }) => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("โหลด PNG ไม่ได้"));
        image.src = `data:image/png;base64,${data}`;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);

      const distinct = (y, height) => {
        const pixels = context.getImageData(0, y, canvas.width, height).data;
        const seen = new Set();
        for (let index = 0; index < pixels.length; index += 16) {
          seen.add(
            `${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`,
          );
        }
        return seen.size;
      };

      return {
        width: canvas.width,
        height: canvas.height,
        ratio: canvas.width / canvas.height,
        topColors: distinct(0, Math.floor(canvas.height * topPart)),
        bottomColors: distinct(
          canvas.height - Math.floor(canvas.height * bottomPart),
          Math.floor(canvas.height * bottomPart),
        ),
      };
    },
    { data: base64, topPart: topRatio, bottomPart: bottomRatio },
  );
}
