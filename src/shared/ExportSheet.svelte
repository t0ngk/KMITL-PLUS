<script>
  import {
    BOTTOM_BAND,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    TOP_BAND,
  } from "./exportCanvas";

  // ผืนภาพสำหรับ export แนวตั้ง — ขนาดคงที่ ไม่ขึ้นกับหน้าจอ เพราะสิ่งที่ถ่าย
  // ไม่ใช่สิ่งที่อยู่บนจอ (mount นอกจอแล้วถ่าย ดู shared/exportCapture.js)
  //
  // แถบที่เว้นไว้ปล่อยว่างโดยตั้งใจ ไม่ใส่ชื่อหรือภาคเรียน — แถบบนนาฬิกาทับจนอ่านไม่ออก
  // แถบล่างเป็นที่ของไอคอนแอปบน home screen ใส่อะไรไปก็โดนบัง
  let { reserve = true, children } = $props();
</script>

<div
  class="flex flex-col bg-canvas"
  style="width: {CANVAS_WIDTH}px; height: {CANVAS_HEIGHT}px;"
>
  {#if reserve}
    <div class="shrink-0" style="height: {TOP_BAND}px;"></div>
  {/if}
  <div class="flex min-h-0 flex-1 flex-col p-4">
    {@render children()}
  </div>
  {#if reserve}
    <div class="shrink-0" style="height: {BOTTOM_BAND}px;"></div>
  {/if}
</div>
