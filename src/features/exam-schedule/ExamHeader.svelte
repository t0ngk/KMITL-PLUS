<script>
  import { blockColors } from "../../shared/colors";
  import { DEFAULT_HEADER_COLOR } from "../../shared/theme";

  // ภาษาเดียวกับ HeaderCard ของหน้าตารางเรียน : แถวเดียว บรรทัดตัวตน + บรรทัดบริบท
  // + ป้ายภาคเรียน ต่างกันแค่หน้านี้มีตัวเลือกรอบสอบเพิ่มมาอีกชิ้น
  //
  // downloading = ระหว่าง capture PNG ให้สลับตัวเลือกรอบเป็นข้อความนิ่ง ๆ
  // (image-export spec : control ในกรอบ capture ต้องกลายเป็น text ตอนถ่าย)
  let { data, downloading = false, switching = false, onSelectRound } = $props();

  // ป้ายภาคเรียนใช้สีที่ผ่าน solver เหมือน HeaderCard ไม่ใช่ kmitl ดิบ
  // (The No Raw Color Rule : ไม่มีพื้นผิวไหนในระบบได้รับสีดิบ)
  const accent = blockColors(DEFAULT_HEADER_COLOR);

  const ROUNDS = [
    { value: "M", label: "กลางภาค" },
    { value: "F", label: "ปลายภาค" },
  ];
  const roundLabel = (term) =>
    ROUNDS.find((round) => round.value === term)?.label ?? "";


</script>

<header class="flex items-center justify-between gap-6 border-b border-line px-6 py-3">
  <div class="flex min-w-0 items-baseline gap-2">
    <p class="shrink-0 text-[13px] font-medium text-ink">{data.studentInfo}</p>
    <p class="truncate text-[11px] text-ink-3">
      {data.faculty} · {data.departmentAndProgramme}
    </p>
  </div>

  <div class="flex shrink-0 items-center gap-2">
    <p
      class="tnum rounded px-2 py-0.5 text-[11px] font-medium"
      style="background-color: {accent.tint}; color: {accent.ink};"
    >
      {data.semesterAndYear}
    </p>

    <!-- ฟอร์มนี้ไม่ได้ถูก submit อีกแล้ว (สลับรอบด้วย fetch ในหน้า) แต่คงไว้เพราะ
         มันคือที่เดียวที่บันทึกว่า reg ต้องการฟิลด์ชื่ออะไร และทำไม student_id ถึงว่าง
         — fetchExamTable ส่งฟิลด์ชุดเดียวกันนี้ -->
    <form action="report_examtable_show.php" method="post">
      <input type="hidden" name="year" id="year" value={data.year} />
      <input type="hidden" name="semester" id="semester" value={data.semester} />
      <!-- คงพฤติกรรมเดิมไว้ : ฟิลด์นี้ส่งค่าว่างมาตั้งแต่ต้น (scraper เก็บไว้ที่ data.studentId)
           server ใช้ session อยู่แล้ว การสลับรอบสอบจึงยังทำงานได้ -->
      <input type="hidden" name="student_id" id="student_id" value={data.student_id} />
      <input type="hidden" name="mid_or_final" value={data.term} />

      {#if downloading}
        <span class="text-[11px] font-medium text-ink-2">{roundLabel(data.term)}</span>
      {:else}
        <!-- segmented : เห็นทั้งสองรอบพร้อมกัน รอบที่กำลังดูอยู่บอกด้วยทั้งพื้น
             น้ำหนักตัวอักษร และ aria-pressed ไม่ได้พึ่งสีอย่างเดียว -->
        <div
          role="group"
          aria-label="รอบสอบ"
          class="flex items-center rounded-lg border border-line p-0.5"
        >
          {#each ROUNDS as item}
            {@const active = item.value === data.term}
            <button
              type="button"
              aria-pressed={active}
              disabled={switching}
              onclick={() => onSelectRound?.(item.value)}
              class="h-7 rounded-md px-2.5 text-[11px] transition-colors disabled:cursor-not-allowed"
              class:cursor-pointer={!switching}
              class:bg-hover={active}
              class:font-medium={active}
              class:text-ink={active}
              class:text-ink-3={!active}
              class:hover:text-ink={!active}
            >
              {item.label}
            </button>
          {/each}
        </div>
      {/if}
    </form>
  </div>
</header>
