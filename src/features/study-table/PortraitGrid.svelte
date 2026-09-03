<script>
  import { layoutWeek, SLOTS_PER_HOUR } from "./placement";
  import { thaiDays } from "../../shared/dateNames";

  // กริดสำหรับภาพแนวตั้ง : วันเป็นคอลัมน์ เวลาไล่ลง — แกนสลับกับ Grid.svelte
  // แต่ใช้ placement.js ตัวเดียวกันตัดสินว่าวิชาไหนอยู่ช่องไหน
  //
  // ข้อความในบล็อก **หมุนเป็นแนวตั้ง** ส่วนกริด ชื่อวัน และแกนเวลายังนอนเหมือนเดิม
  //
  // เหตุผลเป็นตัวเลข : ผืน 540px หักคอลัมน์เวลา 36px เหลือ 7 วัน วันละ 67px
  // ในบล็อกเหลือ 65px ซึ่งที่ 13px ใส่ได้ **6 ตัวอักษรต่อบรรทัด** —
  // "SOFTWARE VERIFICATION AND VALIDATION" แตกเป็น SOFTWA/RE/VERIFICA/TION/...
  // ลดฟอนต์เป็น 11px ได้ 7 ตัว แทบไม่ต่าง **แกนคือข้อจำกัด ไม่ใช่ขนาดฟอนต์**
  //
  // หมุนแล้ว : ความยาวบรรทัด = ความสูงบล็อก (คาบ 3 ชั่วโมง = 162px ~23 ตัวอักษร)
  // จำนวนบรรทัด = ความกว้างบล็อก / line-height ~4 บรรทัด
  //
  // ใน writing-mode: vertical-rl แกน inline คือแนวตั้ง flex-direction: column
  // จึงเรียงของ "ข้าง ๆ กัน" ในแนวนอน — คอลัมน์ชื่อ และคอลัมน์เวลา/ห้อง
  //
  // งบบรรทัดที่มีจริง : 65px - padding 8 = 57px
  // ที่ 13px (line-height 17) ได้ 3 บรรทัด : ชื่อ 2 + เวลา/ห้อง 1 -> ชื่อยาวยังขาด
  // ที่ 11px (line-height 14) ได้ 4 บรรทัด : ชื่อ 3 + เวลา/ห้อง 1 -> ชื่อส่วนใหญ่ครบ
  // เลือก 11px ซึ่งอยู่ใน ramp อยู่แล้ว และบนภาพ scale 2 = 22 device px อ่านได้สบาย
  //
  // เคยลองให้ชื่อกินที่เหลือแล้วเวลา/ห้องอยู่คอลัมน์ของตัวเอง : meta กินไปสองบรรทัด
  // เหลือชื่อบรรทัดครึ่ง ชื่อโดนตัดหนักกว่าเดิม (17 จาก 19 บล็อก)
  const NAME_LINES = 3;
  const LINE_HEIGHT = 14;

  let { schedule, theme, extent } = $props();

  // แถวที่ 1 คือชื่อวัน ช่องเวลาช่องแรกจึงเริ่มที่เส้นกริดที่ 2
  const ROW_OFFSET = 2;
  const HOUR_LABEL_COLUMN = "2.25rem";
  // วันที่ไม่มีเรียนแต่อยู่กลางสัปดาห์ : คงไว้ให้ลำดับวันไม่เพี้ยน แต่บีบให้แคบ
  const EMPTY_DAY_FRACTION = 0.32;

  // 13px x leading-tight (1.25) = 16.25 — ปัดขึ้นกัน off-by-one ที่ทำให้บรรทัด
  // สุดท้ายโดนตัดครึ่ง
  const pad = (value) => String(value).padStart(2, "0");

  const hours = $derived(
    Array.from(
      { length: extent.hourCount },
      (_, index) => index + extent.startHour,
    ),
  );

  const days = $derived(
    layoutWeek(schedule, theme, extent).map((day) => ({
      ...day,
      // เวลา/ห้องต้องมีที่พอทั้งสองแกนถึงจะแสดง
      //   ความยาวบรรทัด : คาบต้องยาวอย่างน้อย 1 ชั่วโมง
      //   จำนวนบรรทัด   : คาบที่ซ้อนกันตั้งแต่ 3 ชั้นขึ้นไปได้ lane กว้าง ~21px
      //                   ซึ่งพอแค่บรรทัดเดียว **ชื่อวิชามาก่อน** ถ้าเหลือที่เดียว
      // (เจอตอนวัด : บล็อกซ้อน 3 ชั้นเคยได้ meta แล้วชื่อเหลือ 0px)
      cards: day.cards.map((card) => ({
        ...card,
        detail: card.slotSpan >= SLOTS_PER_HOUR && card.laneCount <= 2,
      })),
    })),
  );

  const columns = $derived(
    [
      HOUR_LABEL_COLUMN,
      ...days.map(
        (day) => `minmax(0, ${day.used ? 1 : EMPTY_DAY_FRACTION}fr)`,
      ),
    ].join(" "),
  );
</script>

<div
  class="grid h-full w-full bg-white"
  style="grid-template-columns: {columns};
         grid-template-rows: auto repeat({extent.hourCount * SLOTS_PER_HOUR}, minmax(0, 1fr));"
>
  <div style="grid-column: 1; grid-row: 1;"></div>
  {#each days as day, index}
    <div
      class="flex items-center justify-center border-l border-line pb-1.5 text-[11px] text-ink-3"
      style="grid-column: {index + 2}; grid-row: 1;"
    >
      {thaiDays[day.dayIndex]}
    </div>
  {/each}

  {#each hours as hour, index}
    <div
      class="tnum pr-1.5 text-right text-[11px] text-ink-3"
      style="grid-column: 1;
             grid-row: {index * SLOTS_PER_HOUR + ROW_OFFSET} / span {SLOTS_PER_HOUR};"
    >
      {pad(hour)}:00
    </div>
  {/each}

  <!-- ช่องพื้นหลังมีหน้าที่เดียวคือวาดเส้นขอบชั่วโมงกับขอบวัน -->
  {#each days as _, dayIndex}
    {#each hours as _, hourIndex}
      <div
        class="border-t border-l border-line"
        style="grid-column: {dayIndex + 2};
               grid-row: {hourIndex * SLOTS_PER_HOUR + ROW_OFFSET} / span {SLOTS_PER_HOUR};"
      ></div>
    {/each}
  {/each}

  {#each days as day, dayIndex}
    {#each day.cards as card}
      <!-- คาบที่เวลาซ้อนกันแบ่งความกว้างของคอลัมน์วันกันคนละชั้น (lane จาก placement)
           แนวนอนวางเรียงตามแกนเวลาได้ แต่คอลัมน์วันมีความกว้างเดียว ไม่แบ่งก็ทับกันสนิท -->
      <div
        class="z-10 px-px py-px"
        style="grid-column: {dayIndex + 2};
               grid-row: {card.slotStart + ROW_OFFSET} / {card.slotEnd + ROW_OFFSET};
               width: {100 / card.laneCount}%;
               margin-left: {(card.lane * 100) / card.laneCount}%;"
      >
        <div
          class="flex h-full w-full flex-col gap-1 overflow-hidden rounded-md px-1 py-1.5 text-left"
          style={`writing-mode: vertical-rl; background-color: ${card.colors.tint}; color: ${card.colors.ink};`}
          title={card.label}
        >
          <!-- หมุนแล้ว width ของ <p> คือ "ความหนาของกองบรรทัด" ไม่ใช่ความกว้างที่ตาเห็น
               จำกัดชื่อไว้ 2 บรรทัดจึงเหลือที่ให้เวลา/ห้องเสมอ ไม่โดนดันตกขอบ -->
          <p
            class="overflow-hidden text-[11px] leading-tight font-medium"
            style="max-width: {NAME_LINES * LINE_HEIGHT}px;"
          >
            {card.item.subjectName}
          </p>
          {#if card.detail}
            <p
              class="tnum shrink-0 overflow-hidden text-[11px] leading-tight font-light"
              style={`max-width: ${LINE_HEIGHT}px; color: ${card.colors.inkSoft};`}
            >
              {card.item.start}–{card.item.end} ·
              {[card.item.building, card.item.room].filter(Boolean).join(" ")}
              · {card.item.sec} ({card.item.type})
            </p>
          {/if}
        </div>
      </div>
    {/each}
  {/each}
</div>
