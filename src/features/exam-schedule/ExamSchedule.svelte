<script>
  import { untrack } from "svelte";

  import ExamHeader from "./ExamHeader.svelte";
  import ExamExport from "./ExamExport.svelte";
  import ExamTable from "./ExamTable.svelte";
  import { scrapeExamPage } from "./scraper";
  import Controls from "../study-table/Controls.svelte";
  import { fetchExamTable } from "../../services/reg";
  import { setRegistrarStylesEnabled } from "../../shared/registrarStyles";

  let { schedule = [], data, oldDesign = "" } = $props();

  // props เป็นค่าเริ่มต้นเท่านั้น (boot mount ครั้งเดียว) หลังจากนั้น component ถือ state เอง
  // เพื่อสลับรอบสอบได้โดยไม่ต้อง reload — รูปแบบเดียวกับ StudyTable ทุกประการ
  const initial = untrack(() => ({ schedule, data, oldDesign }));

  let table = $state(undefined);
  let downloading = $state(false);
  let mode = $state("new");

  let currentSchedule = $state(initial.schedule);
  let currentData = $state(initial.data);
  // "แบบเดิม" ต้องเป็น HTML ดิบของสิ่งที่กำลังดูอยู่ ไม่ใช่ของรอบที่บังเอิญโหลดตอนเปิดหน้า
  let currentOldHtml = $state(initial.oldDesign);
  let switching = $state(false);
  let switchError = $state("");

  // เหมือนหน้าตารางเรียน : คืน stylesheet ของ reg ให้ markup เดิมของมันเอง
  $effect(() => setRegistrarStylesEnabled(mode === "old"));

  const selectRound = async (round) => {
    if (round === currentData.term || switching) {
      return;
    }
    switching = true;
    switchError = "";
    try {
      // ฟิลด์ชุดเดียวกับที่ <form> ใน ExamHeader ส่งมาแต่ไหนแต่ไร รวมทั้ง student_id
      // ที่ส่งค่าว่าง — server ใช้ session อยู่แล้ว
      const page = await fetchExamTable(
        currentData.year,
        currentData.semester,
        currentData.student_id ?? "",
        round,
      );
      const scraped = scrapeExamPage(page);
      if (!scraped) {
        throw new Error("หน้าตารางสอบไม่มีโครงสร้างที่อ่านได้");
      }
      currentSchedule = scraped.schedule;
      currentData = scraped.data;
      currentOldHtml = page.body.innerHTML;
    } catch (error) {
      // โหลดไม่สำเร็จ : คงรอบเดิมไว้ทั้งหมด ไม่ใช่จอเปล่า
      // segmented จะเด้งกลับไปที่รอบที่แสดงอยู่จริงเอง เพราะมันอ่านจาก currentData
      console.error("KMITL+ : โหลดตารางสอบไม่สำเร็จ", error);
      switchError = "โหลดตารางสอบไม่สำเร็จ";
    } finally {
      switching = false;
    }
  };
</script>

{#if mode == "new"}
  <!-- pb = แถบควบคุม 3.5rem + ระยะห่าง หน้าเว้นที่ให้ dock ไว้ ไม่ให้ทับเนื้อหา -->
  <div class="flex min-h-screen w-full justify-center bg-canvas p-6 pb-[5rem]">
    <div
      bind:this={table}
      class="h-fit w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(16,21,27,0.04),0_1px_3px_rgba(16,21,27,0.06)] transition-opacity duration-150"
      class:opacity-60={switching}
    >
      <ExamHeader
        data={currentData}
        {downloading}
        {switching}
        onSelectRound={selectRound}
      />
      <ExamTable schedule={currentSchedule} />
    </div>
  </div>
{:else}
  <div class="kmitl-table pb-[5rem]">
    {@html currentOldHtml}
  </div>
{/if}

<Controls
  bind:mode
  captureTarget={table}
  portrait={{
    component: ExamExport,
    fittable: false,
    props: { schedule: currentSchedule, data: currentData },
  }}
  {switching}
  {switchError}
  onCaptureStart={() => {
    downloading = true;
  }}
  onCaptureEnd={() => {
    downloading = false;
  }}
/>
