---
version: 1
slug: "src-features-study-table-studytable-svelte"
primary_target: "src/features/study-table/StudyTable.svelte"
related_targets: ["src/features/study-table/Grid.svelte","src/features/study-table/HeaderCard.svelte","src/features/study-table/Controls.svelte","src/features/study-table/CustomizeMenu.svelte"]
---

Scope: หน้าตารางเรียนของ KMITL + (`report_studytable_show.php`) — Operate.
Audience: นักศึกษา สจล. ที่ล็อกอิน reg อยู่แล้ว บนเดสก์ท็อป Chrome.
Job: กวาดตา 2 วินาทีว่าวันนี้/สัปดาห์นี้เรียนอะไร ห้องไหน + แต่งสีแล้วเซฟ PNG ไปแชร์.
Content: ข้อมูลจริงที่ scrape จาก reg เท่านั้น; ขาดแสดง "ไม่ทราบ".
Constraints: MV3 ห้าม CDN · ฟอนต์ bundle + inject inline ให้ snapdom เห็น · ห้าม blur/backdrop-filter/filter ในกรอบ capture · ไทยเป็นพลเมืองชั้นหนึ่ง · Svelte 5 runes + Tailwind v4.
Craft bar (ผู้ใช้กำหนด): Linear, Notion Calendar, Apple Calendar/Fantastical.
รอบนี้เดสก์ท็อปอย่างเดียว ไม่ทำ dark mode; empty/error/loading เข้าโลกใหม่ด้วย. ไม่แตะหน้าตารางสอบ scraper services core.
Unresolved: หน้าตารางสอบจะต่างภาษากันจนกว่าจะทำรอบถัดไป.

## Direction contract

THESIS: ปฏิทินสมัยใหม่ที่ทำให้ดีที่สุด เล่นตรง ไม่มีลูกเล่นแอบใส่ (ผู้ใช้เลือก canon เอง). ปฏิเสธการ์ดทึบตัวหนังสือขาวและปุ่มกลมส้มลอยแบบเดิม.

OWN-WORLD: พื้นขาว/เทาอ่อนมีชั้น, เส้น hairline เดียวทั้งระบบ, เงาเฉพาะสิ่งที่ลอยจริง. บล็อกวิชา = tint + ตัวหนังสือหมึกเข้ม hue เดียวกัน + **แถบสีทึบ 3px ด้านซ้าย**; หัวตารางเป็น **พื้น tint ของสีที่ผู้ใช้เลือก + ป้ายภาคเรียนเฉด solid ตัวหนังสือขาว ไม่มีเส้นคาดบนสุด** ตัวหนังสือในหัวใช้ ink/inkSoft ของ hue เดียวกัน ไม่ใช่เทากลาง (ผู้ใช้ลองครบทั้งเส้นคาด พื้นขาว และพื้นสีจาง แล้วจบที่แบบนี้ — ห้ามใส่เส้นคาดกลับ). สีเต็มความอิ่มเหลือที่เดียวคือแถบซ้ายบล็อกวิชา; สีของ identity หยุดที่หัว กริดข้างล่างพื้นขาวเสมอ. สีทุกค่าที่ derive ต้องผ่าน solver ของ `colors.js` ไม่ใช่สีดิบ. Prompt 300/400/500 tabular numerals.

STORY: เปิดมาเห็น "ตอนนี้" ก่อน แล้ววันนี้ แล้วทั้งสัปดาห์; เชื่อว่านี่คือตารางของตัวเองจริง ๆ; แต่งสีแล้วกดเซฟรูป.

FIRST VIEWPORT: เส้นสี 3px คาดบนสุดของการ์ด, หัวข้อมูลนักศึกษาเป็นบรรทัดชิดซ้ายบนพื้นขาว (ไม่ใช่แบนเนอร์สีเต็มแถบ), ถัดลงมาเป็นกริดสัปดาห์เต็มความกว้าง 08:00–20:00 × 7 วัน, เส้นชั่วโมงเข้มกว่าเส้น 15 นาที, เส้น `#E35205` พาดเฉพาะแถววันคือเวลาปัจจุบัน มีป้ายเวลาเกาะแกนบน, **ไม่มี indicator บอกวันปัจจุบัน** (ผู้ใช้สั่งถอดแถบวันนี้ จุดส้ม และตัวหนาที่ชื่อวัน — ห้ามสร้างกลับ), toolbar อยู่มุมล่างขวานอกกรอบ capture.

FORM: canon (มาตรฐานหมวด) — ผู้ใช้เลือกผ่าน standing exit แทน assigned index 3 (Kokuyo Study Grid); seed key 0198e49c.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
