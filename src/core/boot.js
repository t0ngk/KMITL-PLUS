import { mount } from "svelte";

import promptFontCss from "../assets/fonts.css?inline";
import {
  captureRegistrarStyles,
  setRegistrarStylesEnabled,
} from "../shared/registrarStyles";

// font ต้องเป็น <style> inline ใน DOM ของหน้า — CSS ที่ Chrome inject ผ่าน
// manifest ไม่อยู่ใน document.styleSheets ทำให้ snapdom ไม่เห็น @font-face
// ตอน export PNG (woff2 ถูก inline เป็น data URI แล้ว ไม่มีการเรียก network)
function injectPromptFont(target) {
  const style = target.createElement("style");
  style.textContent = promptFontCss;
  target.head.appendChild(style);
}

/**
 * boot ทำหน้าที่เหมือนกันทุกหน้า:
 * เก็บ HTML เดิม + จำ stylesheet ของ reg ไว้ก่อนแตะ DOM -> inject font -> scrape
 * -> ปิด stylesheet ของ reg -> ล้าง body -> mount component
 *
 * ถ้า scrape พังหรือคืน null (หน้าเว็บไม่ตรงกับที่คาดไว้ / session หมดอายุ)
 * จะไม่ล้าง body ปล่อยให้หน้าเว็บเดิมใช้งานต่อได้ แล้ว log ไว้ให้ debug
 *
 * @param {{
 *   scrape: (doc: Document) => any,
 *   component: any,
 *   toProps: (scraped: any, oldHtml: string) => Record<string, any>,
 * }} page
 */
export function boot(page) {
  const { scrape, component, toProps } = page;

  // ต้องเก็บก่อนแก้ DOM ใด ๆ เพราะปุ่ม "แบบเดิม" ใช้ HTML ชุดนี้
  // และต้องจำ stylesheet ของ reg ก่อน inject อะไรลง <head> ด้วยเหตุผลเดียวกัน
  const oldHtml = document.body.innerHTML;
  captureRegistrarStyles(document);
  injectPromptFont(document);

  let scraped = null;
  try {
    scraped = scrape(document);
  } catch (error) {
    console.error("KMITL+ : อ่านข้อมูลจากหน้าเว็บไม่สำเร็จ", error);
    return null;
  }

  if (!scraped) {
    console.error(
      "KMITL+ : อ่านข้อมูลจากหน้าเว็บไม่สำเร็จ (โครงสร้างหน้าเว็บไม่ตรงกับที่คาดไว้) — แสดงหน้าเดิมแทน",
    );
    return null;
  }

  // ปิด CSS ของ reg ก่อน mount : กฎระดับ element ของมันชนะ utility ของเราเสมอ
  // component จะเปิดคืนเองเมื่อผู้ใช้สลับไปโหมดแบบเดิม
  setRegistrarStylesEnabled(false);

  document.body.innerHTML = "";
  return mount(component, {
    target: document.body,
    props: toProps(scraped, oldHtml),
  });
}
