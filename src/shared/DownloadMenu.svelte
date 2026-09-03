<script>
  import { Popover } from "bits-ui";
  import { snapdom } from "@zumer/snapdom";
  import { tick } from "svelte";

  import { cn } from "./cn";
  import { captureOffScreen } from "./exportCapture";

  // ปุ่มดาวน์โหลดเป็นเมนูรูปแบบ ไม่ใช่กดครั้งเดียวจบ
  //
  // **แบบเดียวตลอดทั้งเมนู** : เลือกรูปแบบ -> ตัวเลือกของรูปแบบนั้นโผล่ใต้มัน ->
  // ปุ่มดาวน์โหลดอันเดียวข้างล่าง ของเดิมปนสองแบบ (แนวนอนเป็นปุ่มกดแล้วโหลดเลย
  // ส่วนแนวตั้งเป็นหัวข้อ + checkbox + ปุ่มอีกอัน) ซึ่งอ่านแล้วไม่รู้ว่าอันไหนทำอะไร
  //
  // ชื่อสวิตช์บอกว่า "เพื่ออะไร" ไม่ใช่ "ทำอะไร" — คนเลือกจุดประสงค์ ไม่ได้เลือกกลไก
  //
  // target = element บนจอสำหรับแนวนอน (กรอบ capture เดิม)
  // portrait = { component, props } สำหรับแนวตั้ง ซึ่ง mount นอกจอตอนถ่าย
  let {
    target,
    portrait,
    class: className = "",
    iconClass = "w-6 h-6",
    onCaptureStart,
    onCaptureEnd,
  } = $props();

  const BASE =
    "h-8 w-8 grid place-items-center rounded-lg text-ink-2 cursor-pointer transition-colors hover:bg-hover hover:text-ink active:bg-line data-[state=open]:bg-hover data-[state=open]:text-ink";
  const CHOICE =
    "flex cursor-pointer flex-col rounded-lg px-2.5 py-2 transition-colors hover:bg-hover";
  const SWITCH =
    "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:bg-hover";

  let open = $state(false);
  let busy = $state(false);
  let format = $state("portrait");
  // จำไว้แค่ในหน้านี้ : ไม่มีอะไรในส่วนขยายนี้ที่จำค่าข้ามรอบ และนี่ไม่ใช่ที่ที่จะเริ่ม
  let reserve = $state(true);
  let fit = $state(true);

  const downloadLandscape = async () => {
    if (!target || busy) {
      return;
    }
    busy = true;
    onCaptureStart?.();
    // รอให้ DOM อัปเดตตาม onCaptureStart ก่อน ไม่งั้น snapdom อาจถ่ายติด form control
    await tick();
    try {
      // embedFonts ของ snapdom default เป็น false — ต้องเปิดเอง ไม่งั้น PNG
      // จะไม่ได้ font Prompt (@font-face เป็น data URI ใน <style> ที่ boot inject ไว้)
      // scale 2 = ภาพคมขึ้น 2 เท่า, reconcile กัน layout เพี้ยนระหว่าง rasterize
      const capture = await snapdom(target, {
        embedFonts: true,
        scale: 2,
        reconcile: true,
      });
      onCaptureEnd?.();
      await capture.download({ format: "png", filename: "image" });
    } catch (error) {
      onCaptureEnd?.();
      console.error("KMITL+ : ดาวน์โหลดรูปภาพไม่สำเร็จ", error);
    }
    busy = false;
    open = false;
  };

  const downloadPortrait = async () => {
    if (!portrait || busy) {
      return;
    }
    busy = true;
    try {
      const props = { ...portrait.props, reserve };
      // fit มีความหมายเฉพาะหน้าที่มีอะไรให้ตัด — หน้าตารางสอบไม่รับ prop นี้
      if (portrait.fittable) {
        props.fit = fit;
      }
      await captureOffScreen(portrait.component, props);
    } catch (error) {
      console.error("KMITL+ : ดาวน์โหลดรูปภาพแนวตั้งไม่สำเร็จ", error);
    }
    busy = false;
    open = false;
  };

  const download = () =>
    format === "landscape" ? downloadLandscape() : downloadPortrait();
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    aria-label="ดาวน์โหลดรูปภาพ"
    class={cn(BASE, className)}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class={iconClass}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  </Popover.Trigger>

  <!-- portal ปักที่ document.body โดยตั้งใจ : popover เป็น chrome ต้องอยู่นอกกรอบ
       capture ของ snapdom (เหมือน CustomizeMenu) -->
  <Popover.Portal to="body">
    <!-- ชั้นกันคลิกทะลุ เหมือน CustomizeMenu : bits-ui ปิดเมนูให้แต่ไม่กินคลิก
         และเพราะชั้นนี้อยู่ใน Portal มันต้องสั่งปิดเอง -->
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
      aria-label="รูปแบบภาพ"
      class="z-[60] w-64 rounded-xl border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(16,21,27,0.04),0_8px_24px_rgba(16,21,27,0.12)] animate-fade-up animate-duration-150 animate-ease-out"
    >
      <fieldset class="flex flex-col gap-0.5">
        <legend class="sr-only">รูปแบบภาพ</legend>

        <!-- ผูกชื่อกับคำอธิบายด้วย id แยกกัน : ถ้าปล่อยให้ <label> ห่อ input เฉย ๆ
             ชื่อที่ AT อ่านจะกลายเป็น "แนวนอน สำหรับดูบนคอมพิวเตอร์" ทั้งก้อน
             ซึ่งอ่านยาวเกินไปและทำให้อ้างถึงตัวเลือกด้วยชื่อของมันไม่ได้ -->
        <label class={CHOICE}>
          <span class="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="radio"
              name="format"
              value="landscape"
              bind:group={format}
              aria-labelledby="format-landscape"
              aria-describedby="format-landscape-note"
              class="accent-kmitl"
            />
            <span id="format-landscape">แนวนอน</span>
          </span>
          <span id="format-landscape-note" class="pl-6 text-[11px] text-ink-3">
            สำหรับดูบนคอมพิวเตอร์
          </span>
        </label>

        <label class={CHOICE}>
          <span class="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="radio"
              name="format"
              value="portrait"
              bind:group={format}
              aria-labelledby="format-portrait"
              aria-describedby="format-portrait-note"
              class="accent-kmitl"
            />
            <span id="format-portrait">แนวตั้ง</span>
          </span>
          <span id="format-portrait-note" class="pl-6 text-[11px] text-ink-3">
            สำหรับตั้งเป็นพื้นหลังมือถือ
          </span>
        </label>

        <!-- ตัวเลือกอยู่ใต้รูปแบบที่มันเป็นของ และโผล่เฉพาะตอนเลือกรูปแบบนั้น
             แนวนอนไม่มีตัวเลือก จึงไม่มีอะไรโผล่ ไม่ใช่มีช่องว่างไว้เฉย ๆ -->
        {#if format === "portrait"}
          <div class="flex flex-col gap-0.5 pl-6">
            <label class={SWITCH}>
              <input type="checkbox" bind:checked={reserve} class="accent-kmitl" />
              เว้นที่ให้นาฬิกา
            </label>
            {#if portrait?.fittable}
              <label class={SWITCH}>
                <input type="checkbox" bind:checked={fit} class="accent-kmitl" />
                ตัดวันและเวลาที่ไม่มีเรียน
              </label>
            {/if}
          </div>
        {/if}
      </fieldset>

      <div class="mt-1.5 border-t border-line pt-1.5">
        <button
          class="w-full cursor-pointer rounded-lg bg-hover px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-line disabled:cursor-not-allowed disabled:text-ink-3"
          disabled={busy}
          onclick={download}
        >
          {busy ? "กำลังสร้างภาพ…" : "ดาวน์โหลด"}
        </button>
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
