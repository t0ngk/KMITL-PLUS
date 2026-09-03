<script>
  import { snapdom } from "@zumer/snapdom";
  import { tick } from "svelte";

  import { cn } from "./cn";

  // target = element ที่จะถูก capture (ส่งมาจาก bind:this ของหน้า)
  // onCaptureStart/onCaptureEnd ใช้สลับ control ในพื้นที่ capture ให้เป็นข้อความนิ่ง ๆ ก่อนถ่าย
  let {
    target,
    class: className = "",
    iconClass = "w-6 h-6",
    onCaptureStart,
    onCaptureEnd,
  } = $props();

  // ปุ่มถือรูปทรงของตัวเอง ผู้เรียกส่ง class มา override เฉพาะที่ต่าง
  // (ก่อนหน้านี้ class ที่ส่งมา "แทนที่" ทั้งก้อน ผู้เรียกจึงต้องส่ง string เต็มเสมอ)
  const BASE =
    "h-8 w-8 grid place-items-center rounded-lg text-ink-2 cursor-pointer transition-colors hover:bg-hover hover:text-ink active:bg-line";

  const download = async () => {
    if (!target) {
      return;
    }
    onCaptureStart?.();
    // รอให้ DOM อัปเดตตาม onCaptureStart ก่อน ไม่งั้น snapdom อาจถ่ายติด form control
    await tick();
    try {
      // embedFonts ของ snapdom default เป็น false — ต้องเปิดเอง ไม่งั้น PNG
      // จะไม่ได้ font Prompt (ตัว @font-face เป็น data URI อยู่ใน <style> ที่
      // boot inject ไว้แล้ว snapdom แค่ต้องถูกสั่งให้เก็บไปด้วย)
      // scale 2 = ภาพคมขึ้น 2 เท่าสำหรับแชร์/ซูม, reconcile กัน layout เพี้ยน
      // ระหว่าง rasterize (แลกกับเวลา capture นานขึ้นเล็กน้อย)
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
  };
</script>

<button onclick={download} class={cn(BASE, className)} aria-label="ดาวน์โหลดรูปภาพ">
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
</button>
