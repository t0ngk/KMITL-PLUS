import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * รวม class ของ component เองเข้ากับ class ที่ผู้เรียกส่งมา โดยให้ของผู้เรียกชนะ
 * เมื่อชนกัน (twMerge ตัดตัวที่ขัดกันออก ไม่ใช่ต่อท้ายทั้งคู่)
 *
 * มีไว้เพื่อ "override" ไม่ใช่ "เขียน conditional" — Svelte มี class: อยู่แล้ว
 * ก่อนหน้านี้ปุ่มดาวน์โหลดรับ prop class แล้วใช้แทนที่ทั้งก้อน ผู้เรียกจึงต้อง
 * ส่ง string เต็มมาเสมอ ทั้งที่อยากเปลี่ยนแค่ระยะห่าง
 *
 * @param {...unknown} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
