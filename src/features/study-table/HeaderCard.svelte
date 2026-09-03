<script>
  import { blockColors } from "../../shared/colors";

  let { header, color } = $props();

  // หัวตารางเป็นบริบท ไม่ใช่พาดหัว : แถวเดียว พื้นขาว สีที่ผู้ใช้เลือกเหลือแค่ป้ายภาคเรียน
  const accent = $derived(blockColors(color));
  const identity = $derived(
    [header.studentId, header.studentName].filter(Boolean).join(" "),
  );
  const context = $derived(
    [header.faculty, header.department, header.major].filter(Boolean).join(" · "),
  );
  const term = $derived([header.semester, header.year].filter(Boolean).join(" "));
</script>

<!-- flex-wrap : บนจอกว้างไม่มีผลอะไร แต่ในภาพ export แนวตั้ง (กว้าง ~500px)
     ป้ายภาคเรียนกับบรรทัดรหัส/ชื่อจะทับกันถ้าไม่ยอมให้ขึ้นบรรทัดใหม่ -->
<header
  class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line px-6 py-3"
>
  <div class="flex min-w-0 items-baseline gap-2">
    <p class="shrink-0 text-[13px] font-medium text-ink">{identity}</p>
    {#if context}
      <p class="truncate text-[11px] text-ink-3">{context}</p>
    {/if}
  </div>
  {#if term}
    <p
      class="tnum shrink-0 rounded px-2 py-0.5 text-[11px] font-medium"
      style="background-color: {accent.tint}; color: {accent.ink};"
    >
      {term}
    </p>
  {/if}
</header>
