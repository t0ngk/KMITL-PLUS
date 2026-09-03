import fs from "node:fs/promises";

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
