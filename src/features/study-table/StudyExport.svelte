<script>
  import HeaderCard from "./HeaderCard.svelte";
  import PortraitGrid from "./PortraitGrid.svelte";
  import { fitExtent, fullExtent } from "./placement";
  import ExportSheet from "../../shared/ExportSheet.svelte";
  import {
    BOTTOM_BAND,
    CANVAS_HEIGHT,
    TOP_BAND,
  } from "../../shared/exportCanvas";

  // สิ่งที่ถูกถ่ายเป็นภาพแนวตั้งของหน้าตารางเรียน
  // reserve = เว้นแถบนาฬิกา, fit = ตัดวัน/ชั่วโมงที่ไม่มีเรียน (สองสวิตช์อิสระกัน)
  let { schedule, header, headerColor, theme, reserve = true, fit = true } =
    $props();

  const extent = $derived(fit ? fitExtent(schedule) : fullExtent(schedule));

  // ความสูงที่เหลือให้กริดจริง ๆ หลังหักแถบที่เว้น ขอบผืน หัวตาราง และแถวชื่อวัน
  // PortraitGrid ใช้ค่านี้ตัดสินจำนวนบรรทัด — เดาไม่ได้เพราะขึ้นกับสองสวิตช์
  const SHEET_PADDING = 32;
  const HEADER_HEIGHT = 46;
  const DAY_ROW_HEIGHT = 26;
  const hourHeight = $derived(
    (CANVAS_HEIGHT -
      (reserve ? TOP_BAND + BOTTOM_BAND : 0) -
      SHEET_PADDING -
      HEADER_HEIGHT -
      DAY_ROW_HEIGHT) /
      extent.hourCount,
  );
</script>

<ExportSheet {reserve}>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white"
  >
    <HeaderCard {header} color={headerColor} />
    <div class="min-h-0 flex-1">
      <PortraitGrid {schedule} {theme} {extent} {hourHeight} />
    </div>
  </div>
</ExportSheet>
