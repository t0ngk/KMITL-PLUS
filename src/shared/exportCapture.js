import { snapdom } from "@zumer/snapdom";
import { mount, tick, unmount } from "svelte";

/**
 * mount component นอกจอ ถ่ายเป็น PNG แล้วเก็บกวาด
 *
 * ต่างจาก export แนวนอนตรงที่ **สิ่งที่ถ่ายไม่ใช่สิ่งที่อยู่บนจอ** ผืนภาพแนวตั้ง
 * มีขนาดคงที่ 540x1260 ไม่ขึ้นกับหน้าต่างเบราว์เซอร์ จึงต้องสร้างขึ้นมาชั่วคราว
 *
 * ต้องอยู่ใน document เดียวกันจริง ๆ ไม่ใช่ detached tree หรือ iframe เพราะ
 * @font-face ของ Prompt ถูก inject เป็น <style> ไว้ใน document.head — snapdom
 * เก็บฟอนต์จากที่นั่น ถ้าไปอยู่คนละ document รูปจะไม่ได้ฟอนต์
 *
 * ระหว่างที่มันมีตัวตนอยู่ต้องแตะไม่ได้ : inert + aria-hidden + ไม่รับ pointer
 * และต้องถูกลบทุกทาง รวมทางที่ถ่ายพัง — ของเต็มจอที่ค้างไว้คือสิ่งที่จะไปโผล่
 * ในภาพครั้งถัดไป
 */
export async function captureOffScreen(component, props) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.inert = true;
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;pointer-events:none;";
  document.body.appendChild(host);

  let app;
  try {
    app = mount(component, { target: host, props });
    // รอให้ layout ของสิ่งที่เพิ่ง mount นิ่งก่อนถ่าย
    await tick();
    const capture = await snapdom(host.firstElementChild, {
      embedFonts: true,
      scale: 2,
      reconcile: true,
    });
    await capture.download({ format: "png", filename: "image" });
  } finally {
    if (app) {
      unmount(app);
    }
    host.remove();
  }
}
