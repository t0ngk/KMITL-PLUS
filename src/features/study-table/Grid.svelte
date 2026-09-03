<script>
  import { blockColors } from "../../shared/colors";
  import { getTheme } from "../../shared/theme";
  import { thaiDays } from "../../shared/dateNames";

  // แกนเวลาคงที่ 08:00-20:00 : ทุกภาคเรียนอ่านที่ตำแหน่งเดิม และรูปที่ export
  // ออกไปเทียบกันได้ตรง ๆ ตารางที่เรียนไม่เต็มช่วงจึงมีคอลัมน์ว่างโดยตั้งใจ
  const START_HOUR = 8;
  const HOUR_COUNT = 12;
  // ช่อง 15 นาทีเป็นหน่วยของ "การวางบล็อก" เท่านั้น เส้นที่วาดจริงมีแค่ขอบชั่วโมง
  const SLOTS_PER_HOUR = 4;
  const SLOT_COUNT = HOUR_COUNT * SLOTS_PER_HOUR;
  // คอลัมน์ 1 คือชื่อวัน ช่องเวลาช่องแรกจึงเริ่มที่เส้นกริดที่ 2
  const COLUMN_OFFSET = 2;
  const GRID_END = SLOT_COUNT + COLUMN_OFFSET;
  const DAY_COLUMN = "3.5rem";
  // คาบสั้นที่ไม่มีที่พอใส่ชื่อ ยืมช่องว่างข้าง ๆ ได้มากสุดเท่านี้
  const LABEL_OVERFLOW_SLOTS = 8;

  let { schedule, theme } = $props();

  const pad = (value) => String(value).padStart(2, "0");
  const minutesOf = (time) => {
    const [hour, minute] = time.split(":");
    return parseInt(hour) * 60 + parseInt(minute);
  };
  // "HH:MM" -> ลำดับช่อง 15 นาทีนับจาก START_HOUR (ข้อมูล snap มาที่ 15 นาทีแล้ว)
  const slotOf = (time) => Math.floor((minutesOf(time) - START_HOUR * 60) / 15);

  const hours = Array.from({ length: HOUR_COUNT }, (_, index) => index + START_HOUR);

  // วิชา -> พิกัดคอลัมน์ตรง ๆ เรียงตามลำดับใน schedule เดิม
  // วิชาที่มาทีหลังจึงทับวิชาก่อนหน้าเมื่อเวลาซ้อนกัน
  const rows = $derived(
    thaiDays.map((_, dayIndex) => {
      const cards = schedule
        .filter((item) => item.dayIndex === dayIndex)
        .map((item) => {
          const columnStart = slotOf(item.start) + COLUMN_OFFSET;
          const columnEnd = slotOf(item.end) + COLUMN_OFFSET;
          const slotSpan = columnEnd - columnStart;
          return {
            item,
            colors: blockColors(getTheme(theme, item.subjectId)),
            columnStart,
            columnEnd,
            // คาบสั้นกว่า 1 ชั่วโมงไม่มีที่พอสำหรับสามบรรทัด และคาบ 15-30 นาที
            // ไม่มีที่พอแม้แต่ชื่อวิชา — ตัดเนื้อหาลงตามความกว้างจริง ไม่ปล่อยให้ล้น
            detail: slotSpan >= SLOTS_PER_HOUR,
            titled: slotSpan > 2,
            label: `${item.subjectName} ${item.start}–${item.end}`,
          };
        });
      // บล็อกที่แคบจนไม่เหลือที่ใส่ชื่อ ให้ชื่อเริ่มในบล็อกแล้วล้นออกทางขวา
      // สีอย่างเดียวบอกไม่ได้ว่าวิชาอะไร และ title/sr-only ไม่ติดไปในรูป PNG
      return {
        dayIndex,
        cards: cards.map((card, index) => {
          if (card.titled) {
            return card;
          }
          const nextStart = cards[index + 1]?.columnStart ?? GRID_END;
          const labelEnd = Math.min(card.columnEnd + LABEL_OVERFLOW_SLOTS, nextStart);
          return { ...card, labelEnd: labelEnd > card.columnEnd ? labelEnd : null };
        }),
      };
    }),
  );
</script>

<div class="flex min-h-0 flex-1">
  <div
    class="grid min-h-0 w-full flex-1 bg-white"
    style="grid-template-columns: {DAY_COLUMN} repeat({SLOT_COUNT}, minmax(0, 1fr));
           grid-template-rows: auto repeat({rows.length}, minmax(3.5rem, 1fr));"
  >
    <div style="grid-column: 1; grid-row: 1;"></div>
    {#each hours as hour, index}
      <div
        class="tnum border-l border-line px-2 pt-2 pb-1.5 text-[11px] text-ink-3"
        style="grid-column: {index * SLOTS_PER_HOUR + COLUMN_OFFSET} / span {SLOTS_PER_HOUR};
               grid-row: 1;"
      >
        {pad(hour)}:00
      </div>
    {/each}

    <!-- subgrid ทำให้แถววันยังใช้คอลัมน์ชุดเดียวกับหัวตาราง เส้นแบ่งจึงตรงกับขอบชั่วโมงเสมอ -->
    <div
      style="grid-column: 1 / -1; grid-row: 2 / -1;
             grid-template-columns: subgrid; grid-template-rows: subgrid;"
      class="grid"
    >
      {#each rows as row, rowIndex}
        <div
          class="group grid border-t border-line transition-colors hover:bg-hover"
          style="grid-column: 1 / -1; grid-row: {rowIndex + 1};
                 grid-template-columns: subgrid; grid-template-rows: minmax(0, 1fr);"
        >
          <div
            class="flex items-center px-3 text-[11px] text-ink-3"
            style="grid-column: 1; grid-row: 1;"
          >
            {thaiDays[row.dayIndex]}
          </div>
          <!-- ช่องพื้นหลังมีหน้าที่เดียวคือวาดเส้นขอบชั่วโมง -->
          {#each hours as _, hourIndex}
            <div
              class="border-l border-line"
              style="grid-column: {hourIndex * SLOTS_PER_HOUR + COLUMN_OFFSET} / span {SLOTS_PER_HOUR};
                     grid-row: 1;"
            ></div>
          {/each}
          {#each row.cards as card}
            <!-- พื้นขาว/hover ของ wrapper ทับเส้นแบ่งที่อยู่ใต้การ์ด ให้บล็อกเป็นก้อนเดียวไม่มีเส้นลอด -->
            <div
              class="z-10 bg-white py-1 pr-px transition-colors group-hover:bg-hover"
              style="grid-column: {card.columnStart} / {card.columnEnd}; grid-row: 1;"
            >
              <div
                class="flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-md px-2.5 py-1.5 text-left"
                style={`background-color: ${card.colors.tint}; color: ${card.colors.ink};`}
                title={card.label}
              >
                {#if card.titled}
                  <p
                    class="text-[13px] leading-tight font-medium"
                    class:line-clamp-2={card.detail}
                    class:truncate={!card.detail}
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
            {#if card.labelEnd}
              <!-- ชื่อเริ่มที่ขอบในของบล็อกแล้วล้นออกขวา : อ่านเป็นก้อนเดียวกับบล็อก
                   วางไว้หลังบล็อกใน DOM เพื่อให้ทับพื้น tint ได้โดยไม่ต้องขึ้น z ใหม่ -->
              <p
                class="pointer-events-none z-10 self-center truncate px-2.5 text-[11px] leading-tight"
                style="grid-column: {card.columnStart} / {card.labelEnd}; grid-row: 1;
                       color: {card.colors.ink};"
              >
                {card.item.subjectName}
              </p>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
