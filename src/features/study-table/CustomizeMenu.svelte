<script>
  // popover จาก bits-ui : Escape / คลิกนอก / focus trap / คืน focus / role+label
  // มาพร้อมกัน ของเดิมเขียนมือและไม่มีสักอย่าง (specs/theme-customize บันทึกไว้แล้ว
  // ว่าพฤติกรรมพวกนี้เป็นข้อกำหนด ไม่ใช่ผลพลอยได้ของไลบรารี)
  import { Popover } from "bits-ui";

  import { blockColors } from "../../shared/colors";
  import { getTheme } from "../../shared/theme";

  let { theme = $bindable(), headerColor = $bindable(), onReset } = $props();

  // ผูกสถานะไว้เองเพื่อ render ชั้นกันคลิกตอนเปิด — ไม่พึ่งว่า Portal จะ mount
  // เฉพาะตอนเปิด ซึ่งเป็นรายละเอียดภายในของไลบรารีที่ API ไม่ได้รับประกัน
  let open = $state(false);

  const SWATCH_ROW =
    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-hover";
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    aria-label="ปรับแต่งสีตาราง"
    class="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink active:bg-line data-[state=open]:bg-hover data-[state=open]:text-ink"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="h-4 w-4"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
      />
    </svg>
  </Popover.Trigger>

  <!-- portal ปักที่ document.body โดยตั้งใจ ไม่ใช่ค่า default ที่ปล่อยผ่าน :
       popover เป็น chrome ต้องอยู่นอกกรอบ capture ของ snapdom
       ถ้าย้าย UI เข้า shadow root เมื่อไหร่ ต้องกลับมาเปลี่ยน target ตรงนี้
       (design.md decision 4) -->
  <Popover.Portal to="body">
    <!-- ชั้นกันคลิกทะลุ : เมนูนี้ประกาศตัวเป็น dialog และ bits-ui กัก focus ให้แล้ว
         แต่เมาส์ยังทะลุไปกดปุ่มข้างล่างได้ในคลิกเดียว (คลิกปิดยิงที่ pointerup
         ส่วนปุ่มยิงที่ click ที่ตามมา — คนละ event ไม่มี prop ไหนคั่นได้)
         z-[59] : เหนือ dock (z-50) ใต้เนื้อเมนู (z-[60])
         ต้องสั่งปิดเอง : ชั้นนี้อยู่ใน Portal ของ popover bits-ui จึงนับว่าเป็น
         "ข้างใน" และไม่ยิง interact outside ให้ (วัดแล้ว เมนูค้างเปิด) -->
    {#if open}
      <div
        class="fixed inset-0 z-[59]"
        aria-hidden="true"
        onclick={() => (open = false)}
      ></div>
    {/if}
    <Popover.Content
      side="top"
      align="end"
      sideOffset={8}
      role="dialog"
      aria-label="ปรับแต่งสี"
      class="z-[60] w-80 rounded-xl border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(16,21,27,0.04),0_8px_24px_rgba(16,21,27,0.12)] animate-fade-up animate-duration-150 animate-ease-out"
    >
      <p class="px-2.5 pt-1.5 pb-2 text-[11px] tracking-[0.08em] text-ink-3 uppercase">
        ปรับแต่งสี
      </p>
      <div class="kmitl-scroll max-h-72 overflow-y-auto">
        <label class={SWATCH_ROW}>
          <span class="truncate text-[13px] text-ink">หัวตาราง</span>
          <span class="relative shrink-0">
            <input
              type="color"
              bind:value={headerColor}
              aria-label="สีหัวตาราง"
              class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span
              class="block h-5 w-5 rounded-md ring-1 ring-black/10"
              style={`background-color: ${headerColor}`}
            ></span>
          </span>
        </label>
        {#each theme as item}
          <!-- swatch แสดงสีที่ใช้จริงบนบล็อก (tint + หมึก) ไม่ใช่สีฐานดิบ -->
          {@const applied = blockColors(getTheme(theme, item.subjectId))}
          <label class={SWATCH_ROW}>
            <span class="truncate text-[13px] text-ink">{item.subjectName}</span>
            <span class="relative shrink-0">
              <input
                type="color"
                bind:value={item.color}
                aria-label={`สีวิชา ${item.subjectName}`}
                class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span
                class="block h-5 w-5 rounded-md"
                style={`background-color: ${applied.tint}; box-shadow: inset 0 0 0 1.5px ${applied.bar};`}
              ></span>
            </span>
          </label>
        {/each}
      </div>
      <div class="mt-1.5 border-t border-line pt-1.5">
        <button
          onclick={onReset}
          class="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        >
          คืนค่าสีเริ่มต้น
        </button>
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
