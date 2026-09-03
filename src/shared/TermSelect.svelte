<script>
  // listbox แทน <select> ของเบราว์เซอร์
  //
  // เหตุผลไม่ใช่ความสวย : registrar.css เขียน `SELECT {}` ไว้ตรง ๆ และเป็น unlayered
  // จึงชนะ utility ของ tailwind ทุกกรณี การมี <select> ในหน้าคือการเปิดช่องให้มันเสมอ
  // — div + role=listbox ไม่มีชื่อให้ reg เรียก (ดู design.md decision 1)
  import { Select } from "bits-ui";

  import { cn } from "./cn";

  let {
    value,
    options = [],
    label,
    format = (option) => option,
    // ใช้เมื่อ value ว่าง = ยังไม่รู้ว่ากำลังดูเทอมไหน ต้องไม่แสดงตัวเลขมั่ว ๆ แทน
    placeholder = "",
    disabled = false,
    onSelect,
    class: className = "",
  } = $props();

  const TRIGGER =
    "flex h-8 items-center gap-1 rounded-lg pr-2 pl-2.5 text-[13px] font-medium text-ink cursor-pointer transition-colors hover:bg-hover data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-3";
</script>

<Select.Root
  type="single"
  {value}
  {disabled}
  onValueChange={(next) => next && next !== value && onSelect?.(next)}
>
  <Select.Trigger aria-label={label} class={cn(TRIGGER, className)}>
    {value ? format(value) : placeholder}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="h-3.5 w-3.5 text-ink-3"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  </Select.Trigger>

  <!-- portal ปักไว้ที่ document.body โดยตั้งใจ ไม่ใช่ค่า default ที่ปล่อยผ่าน :
       วันนี้ถูกต้องเพราะ popover เป็น chrome ต้องอยู่นอกกรอบ capture
       แต่จะผิดทันทีที่ย้าย UI เข้า shadow root — ตอนนั้นต้องเปลี่ยน target ที่นี่
       (design.md decision 4) -->
  <Select.Portal to="body">
    <Select.Content
      sideOffset={6}
      class="z-[60] min-w-[8rem] rounded-xl border border-line bg-white p-1 shadow-[0_1px_2px_rgba(16,21,27,0.04),0_8px_24px_rgba(16,21,27,0.12)] animate-fade-up animate-duration-150 animate-ease-out"
    >
      <Select.Viewport>
        {#each options as option}
          <Select.Item
            value={option}
            label={format(option)}
            class="flex cursor-pointer items-center rounded-lg px-2.5 py-2 text-[13px] text-ink transition-colors data-[highlighted]:bg-hover data-[selected]:font-medium"
          >
            {format(option)}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
