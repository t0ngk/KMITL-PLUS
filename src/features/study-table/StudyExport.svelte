<script>
  import PortraitGrid from "./PortraitGrid.svelte";
  import { fitExtent, fullExtent } from "./placement";
  import ExportHeader from "../../shared/ExportHeader.svelte";
  import ExportSheet from "../../shared/ExportSheet.svelte";

  // สิ่งที่ถูกถ่ายเป็นภาพแนวตั้งของหน้าตารางเรียน
  // reserve = เว้นแถบนาฬิกา, fit = ตัดวัน/ชั่วโมงที่ไม่มีเรียน (สองสวิตช์อิสระกัน)
  let { schedule, header, headerColor, theme, reserve = true, fit = true } =
    $props();

  const extent = $derived(fit ? fitExtent(schedule) : fullExtent(schedule));
  // เอาเฉพาะบรรทัดเทอม ไม่เอารหัส/ชื่อ/คณะ (ExportHeader อธิบายเหตุผลไว้)
  const term = $derived(
    [header.semester, header.year].filter(Boolean).join(" "),
  );

</script>

<ExportSheet {reserve}>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white"
  >
    <ExportHeader {term} color={headerColor} />
    <div class="min-h-0 flex-1">
      <PortraitGrid {schedule} {theme} {extent} />
    </div>
  </div>
</ExportSheet>
