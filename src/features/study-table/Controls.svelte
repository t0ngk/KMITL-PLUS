<script>
  import CustomizeMenu from "./CustomizeMenu.svelte";
  import DownloadMenu from "../../shared/DownloadMenu.svelte";
  import TermSelect from "../../shared/TermSelect.svelte";

  // dock ใช้ร่วมกันทั้งสองหน้า : หน้าตารางสอบไม่มี picker และไม่มีเมนูแต่งสี
  // ส่วนพวกนั้นจึงเป็น optional — หน้าที่ส่งมาครบต้อง render เหมือนเดิมทุกประการ
  let {
    mode = $bindable(),
    captureTarget,
    // { component, props, fittable } ของภาพแนวตั้ง — mount นอกจอตอนถ่าย
    portrait,
    theme = $bindable(),
    headerColor = $bindable(),
    onResetTheme,
    customizable = false,
    // หน้าตารางสอบใช้สองตัวนี้สลับตัวเลือกรอบสอบเป็นข้อความนิ่ง ๆ ระหว่าง capture
    onCaptureStart,
    onCaptureEnd,
    pickerReady = false,
    years = [],
    semesters = [],
    selectedYear = "",
    selectedSemester = "",
    switching = false,
    switchError = "",
    onSelectTerm,
  } = $props();

  const BUTTON =
    "h-8 px-2.5 rounded-lg text-[13px] font-medium text-ink-2 cursor-pointer transition-colors hover:bg-hover hover:text-ink active:bg-line";
</script>

<!-- แถบควบคุมยึดขอบล่างเต็มความกว้าง : หน้าเว้นที่ให้มันไว้แล้ว (StudyTable pb)
     จึงไม่ทับตาราง และยังอยู่นอกกรอบ capture เหมือนเดิม
     animate-* ใช้ได้ที่นี่เพราะอยู่นอกกรอบ capture ห้ามยกเข้าไปใน sheet/grid -->
<div
  class="fixed inset-x-0 bottom-0 z-50 flex h-14 animate-fade-up items-center justify-between gap-4 border-t border-line bg-white px-6 animate-duration-200 animate-ease-out"
>
  <p class="truncate text-[13px]" class:text-kmitl={switchError} class:text-ink-3={!switchError}>
    {#if mode == "new" && switchError}
      <span role="alert">{switchError}</span>
    {:else if mode == "new" && switching}
      กำลังโหลด…
    {/if}
  </p>
  <div class="flex items-center gap-1">
    {#if mode == "new"}
      {#if pickerReady}
        <TermSelect
          value={selectedYear}
          options={years}
          label="ปีการศึกษา"
          format={(year) => `ปีการศึกษา ${year}`}
          placeholder="เลือกปีการศึกษา"
          disabled={switching}
          onSelect={(year) => onSelectTerm(year, selectedSemester)}
        />
        <TermSelect
          value={selectedSemester}
          options={semesters}
          label="ภาคเรียน"
          format={(semester) => `ภาคเรียนที่ ${semester}`}
          placeholder="เลือกภาคเรียน"
          disabled={switching}
          onSelect={(semester) => onSelectTerm(selectedYear, semester)}
        />
        <div class="mx-0.5 h-5 w-px bg-line"></div>
      {/if}
      {#if customizable}
        <CustomizeMenu bind:theme bind:headerColor onReset={onResetTheme} />
      {/if}
      <DownloadMenu
        target={captureTarget}
        {portrait}
        iconClass="w-4 h-4"
        {onCaptureStart}
        {onCaptureEnd}
      />
      <div class="mx-0.5 h-5 w-px bg-line"></div>
    {/if}
    <button
      onclick={() => {
        mode = mode == "new" ? "old" : "new";
      }}
      class={BUTTON}
    >
      {mode == "new" ? "แบบเดิม" : "แบบใหม่"}
    </button>
  </div>
</div>
