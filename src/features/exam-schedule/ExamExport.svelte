<script>
  import ExamCards from "./ExamCards.svelte";
  import ExamHeader from "./ExamHeader.svelte";
  import ExportSheet from "../../shared/ExportSheet.svelte";

  // สิ่งที่ถูกถ่ายเป็นภาพแนวตั้งของหน้าตารางสอบ
  // ไม่มีสวิตช์ "ตัดตามเนื้อหา" ที่นี่ : รายการสอบมีเท่าที่มีอยู่แล้ว ไม่มีอะไรให้ตัด
  let { schedule = [], data, reserve = true } = $props();
</script>

<ExportSheet {reserve}>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white"
  >
    <!-- downloading = true : ตัวเลือกรอบสอบกลายเป็นข้อความนิ่ง ตามกฎกรอบ capture -->
    <ExamHeader {data} downloading={true} />
    <div class="min-h-0 flex-1 overflow-hidden">
      <ExamCards {schedule} />
    </div>
  </div>
</ExportSheet>
