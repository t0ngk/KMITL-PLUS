<script>
  import { blockColors } from "./colors";

  // หัวตารางของภาพแนวตั้ง — บอกแค่ว่าเป็นเทอมไหน
  //
  // **ไม่มีรหัสนักศึกษา ชื่อ คณะ ภาควิชา หรือสาขา โดยตั้งใจ** วอลเปเปอร์คือสิ่งเดียว
  // ที่ออกจากเบราว์เซอร์ไปให้คนอื่นเห็น ส่วนภาพแนวนอนยังมีครบเหมือนเดิมเพราะเป็นภาพ
  // ที่เก็บไว้ดูเอง — สองอันนี้ต่างกันด้วยเหตุผล ไม่ใช่หลงลืม อย่ารวมให้เหมือนกัน
  //
  // note = ข้อความเสริมของหน้านั้น (หน้าสอบใส่รอบสอบ) หน้าตารางเรียนไม่ส่งมา
  let { term, note = "", color } = $props();

  const accent = $derived(blockColors(color));
</script>

<header class="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
  <p
    class="tnum rounded px-2 py-0.5 text-[11px] font-medium"
    style="background-color: {accent.tint}; color: {accent.ink};"
  >
    {term}
  </p>
  {#if note}
    <p class="text-[11px] text-ink-3">{note}</p>
  {/if}
</header>
