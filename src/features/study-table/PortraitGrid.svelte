<script>
  import { layoutWeek, SLOTS_PER_HOUR } from "./placement";
  import { thaiDays } from "../../shared/dateNames";

  // กริดสำหรับภาพแนวตั้ง : วันเป็นคอลัมน์ เวลาไล่ลง — แกนสลับกับ Grid.svelte
  // แต่ใช้ placement.js ตัวเดียวกันตัดสินว่าวิชาไหนอยู่ช่องไหน
  //
  // ที่นี่ไม่ใช่ Grid.svelte ที่หมุน 90 องศา : เกณฑ์ว่าอะไรใส่ลงได้ต่างกันสิ้นเชิง
  // แนวนอน 1 ชั่วโมง = ความกว้าง ~116px ใส่ได้ 2 บรรทัด
  // แนวตั้ง  1 ชั่วโมง = ความสูง ~87px แต่กว้าง ~120px ใส่ได้ 4 บรรทัด
  // และคาบยาวยิ่งมีที่มาก — จำนวนบรรทัดจึงคิดจากความสูงจริงของบล็อก ไม่ล็อกไว้ที่ 2

  // hourHeight = ความสูงจริงต่อหนึ่งชั่วโมงในผืนที่จะถ่าย ผู้เรียกคำนวณให้เพราะ
  // มันขึ้นกับว่าเว้นแถบนาฬิกาไหมและตัดเหลือกี่ชั่วโมง — ใช้คิดว่าใส่ได้กี่บรรทัด
  // ถ้าเดาค่านี้ ข้อความจะล้นออกนอกบล็อกเวลาชั่วโมงเตี้ยกว่าที่เดา
  let { schedule, theme, extent, hourHeight } = $props();

  // แถวที่ 1 คือชื่อวัน ช่องเวลาช่องแรกจึงเริ่มที่เส้นกริดที่ 2
  const ROW_OFFSET = 2;
  const HOUR_LABEL_COLUMN = "2.25rem";
  // วันที่ไม่มีเรียนแต่อยู่กลางสัปดาห์ : คงไว้ให้ลำดับวันไม่เพี้ยน แต่บีบให้แคบ
  const EMPTY_DAY_FRACTION = 0.32;

  // 13px x leading-tight (1.25) = 16.25 — ปัดขึ้นกัน off-by-one ที่ทำให้บรรทัด
  // สุดท้ายโดนตัดครึ่ง
  const LINE_HEIGHT = 17;
  const BLOCK_PADDING = 14;
  const MAX_NAME_LINES = 6;

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
      cards: day.cards.map((card) => {
        const height = (card.slotSpan / SLOTS_PER_HOUR) * hourHeight;
        // คาบ 1 ชั่วโมงขึ้นไปมีที่พอสำหรับเวลาและห้อง — ต่ำกว่านั้นเหลือแค่ชื่อ
        const detail = card.slotSpan >= SLOTS_PER_HOUR;
        const forName = height - BLOCK_PADDING - (detail ? LINE_HEIGHT * 2 : 0);
        return {
          ...card,
          detail,
          // คาบ 15-30 นาที (สูง ~22-44px) ไม่เหลือที่แม้แต่บรรทัดเดียว
          nameLines: Math.min(
            MAX_NAME_LINES,
            Math.floor(forName / LINE_HEIGHT),
          ),
        };
      }),
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
          class="flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-md px-1.5 py-1 text-left"
          style={`background-color: ${card.colors.tint}; color: ${card.colors.ink};`}
          title={card.label}
        >
          {#if card.nameLines > 0}
            <p
              class="overflow-hidden text-[13px] leading-tight font-medium break-words hyphens-auto"
              style="display: -webkit-box; -webkit-box-orient: vertical;
                     -webkit-line-clamp: {card.nameLines};"
            >
              {card.item.subjectName}
            </p>
          {/if}
          {#if card.detail}
            <p class="tnum text-[11px] leading-tight font-light">
              {card.item.start}–{card.item.end}
            </p>
            <p
              class="mt-auto truncate text-[11px] leading-tight font-light"
              style={`color: ${card.colors.inkSoft};`}
            >
              {[card.item.building, card.item.room].filter(Boolean).join(" ")}
              · {card.item.sec} ({card.item.type})
            </p>
          {/if}
        </div>
      </div>
    {/each}
  {/each}
</div>
