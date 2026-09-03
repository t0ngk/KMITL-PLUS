<script>
  import { onMount, untrack } from "svelte";
  import Controls from "./Controls.svelte";
  import Grid from "./Grid.svelte";
  import StudyExport from "./StudyExport.svelte";
  import HeaderCard from "./HeaderCard.svelte";
  import { scrapeStudyTablePage, toHeader } from "./scraper";
  import { fetchStudyTable, fetchTermOptions } from "../../services/reg";
  import { setRegistrarStylesEnabled } from "../../shared/registrarStyles";
  import { DEFAULT_HEADER_COLOR, makeTheme } from "../../shared/theme";

  let { schedule = [], info = null, oldTable = "" } = $props();

  // ปี/ภาคเรียนที่แสดงอยู่ ดึงตัวเลขออกจากข้อความไทยที่ scrape มา
  // เช่น "ปีการศึกษา 2567" -> "2567", "ประจำภาคเรียนที่ 2" -> "2"
  //
  // อ่านไม่ออกได้ "" และต้องปล่อยให้เป็น "" ต่อไป : เดิมโค้ดตกไปที่ years[0] เงียบ ๆ
  // picker เลยอ้างเทอมที่ไม่ได้แสดงอยู่ แล้วยังส่งปีผิดนั้นไปตอนสลับภาคเรียนด้วย
  const matchNumber = (text, pattern) => text.match(pattern)?.[0] ?? "";

  // props ถูกใช้เป็นค่าเริ่มต้นเท่านั้น (boot mount ครั้งเดียว) หลังจากนั้น component จะถือ state เอง
  // เพื่อสลับภาคเรียนได้โดยไม่ต้อง reload หน้า
  const initial = untrack(() => {
    const initialHeader = toHeader(info);
    return {
      schedule,
      oldTable,
      header: initialHeader,
      year: matchNumber(initialHeader.year, /\d{4}/),
      semester: matchNumber(initialHeader.semester, /\d/),
    };
  });

  let table = $state(undefined);
  let mode = $state("new");

  // โหมดแบบเดิมคือ markup ของ reg เอง ต้องได้ stylesheet ของตัวเองกลับมา
  // ถึงจะเหมือนหน้าจริง ส่วนโหมดใหม่ต้องไม่ให้กฎระดับ element ของ reg เอื้อมถึง
  $effect(() => setRegistrarStylesEnabled(mode === "old"));

  let currentSchedule = $state(initial.schedule);
  // "แบบเดิม" ต้องเป็น HTML ดิบของเทอมที่กำลังดูอยู่ ไม่ใช่ของเทอมที่บังเอิญโหลดตอนเปิดหน้า
  let currentOldHtml = $state(initial.oldTable);
  let header = $state(initial.header);
  let theme = $state(makeTheme(initial.schedule));
  let headerColor = $state(DEFAULT_HEADER_COLOR);

  let years = $state([]);
  let semesters = $state([]);
  let selectedYear = $state(initial.year);
  let selectedSemester = $state(initial.semester);
  // เทอมที่แสดงอยู่จริง ๆ ว่างได้ถ้าอ่านหัวตารางไม่ออก — failure path จะได้ไม่คืนค่า
  // ที่ไม่เคยแสดงมาก่อนกลับเข้า picker
  let appliedYear = initial.year;
  let appliedSemester = initial.semester;
  let pickerReady = $state(false);
  let switching = $state(false);
  let switchError = $state("");

  onMount(async () => {
    try {
      const options = await fetchTermOptions();
      // ขาดลิสต์ไหนก็ตาม = ซ่อน picker ไปเลย ตารางที่แสดงอยู่ยังใช้งานได้ปกติ
      // ไม่มีรายการสำรอง : เสนอเท่าที่ reg เสนอ ไม่งั้นก็ไม่เสนอ
      if (options.years.length === 0 || options.semesters.length === 0) {
        return;
      }
      years = options.years;
      semesters = options.semesters;
      // ไม่มีการเดาตรงนี้อีกแล้ว : ถ้าอ่านเทอมจากหน้าไม่ออก picker จะบอกว่ายังไม่รู้
      // ดีกว่าโชว์เลขที่หน้าไม่ได้แสดงอยู่ (เดิมโชว์ปีล่าสุดเสมอ)
      pickerReady = true;
    } catch (error) {
      // ดึงรายการภาคเรียนไม่ได้ (offline / session หมดอายุ / หน้าเว็บเปลี่ยน)
      // ซ่อน picker ไว้ ตารางที่แสดงอยู่ยังใช้งานได้ตามปกติ
      console.error("KMITL+ : โหลดรายการภาคเรียนไม่สำเร็จ", error);
    }
  });

  const selectTerm = async (nextYear, nextSemester) => {
    selectedYear = nextYear;
    selectedSemester = nextSemester;
    // เลือกยังไม่ครบทั้งสองช่อง (เกิดได้เมื่ออ่านเทอมจากหน้าไม่ออก) — ยังยิงไม่ได้
    // ถ้ายิงตอนนี้จะได้เทอมที่ไม่มีใครขอ ซึ่งคือบั๊กเดิมในรูปแบบใหม่
    if (!nextYear || !nextSemester) {
      return;
    }
    switching = true;
    switchError = "";
    try {
      const page = await fetchStudyTable(nextYear, nextSemester);
      const scraped = scrapeStudyTablePage(page);
      currentSchedule = scraped.schedule;
      currentOldHtml = page.body.innerHTML;
      theme = makeTheme(currentSchedule);
      // หน้าที่ scrape หัวตารางไม่ได้ (หรือได้แต่ไม่มีเทอม) ยังต้องบอกเทอมให้ถูก
      // เพราะเราเป็นคนขอไปเอง จึงรู้แน่ว่าขออะไร — ป้ายกับ picker จะได้ตรงกันเสมอ
      const scrapedHeader = scraped.info ? toHeader(scraped.info) : header;
      header = {
        ...scrapedHeader,
        semester: scrapedHeader.semester || `ประจำภาคเรียนที่ ${nextSemester}`,
        year: scrapedHeader.year || `ปีการศึกษา ${nextYear}`,
      };
      appliedYear = nextYear;
      appliedSemester = nextSemester;
    } catch (error) {
      // โหลดไม่สำเร็จ : คงตารางเดิมไว้ แล้วย้อน picker กลับไปที่ภาคเรียนที่แสดงอยู่
      console.error("KMITL+ : โหลดตารางเรียนไม่สำเร็จ", error);
      switchError = "โหลดตารางเรียนไม่สำเร็จ";
      selectedYear = appliedYear;
      selectedSemester = appliedSemester;
    } finally {
      switching = false;
    }
  };

  const resetTheme = () => {
    theme = makeTheme(currentSchedule);
    headerColor = DEFAULT_HEADER_COLOR;
  };
</script>

{#if mode == "new"}
  <!-- สูงเท่าจอเป๊ะ ไม่ให้หน้า scroll ได้นิด ๆ ; pb = แถบควบคุม 3.5rem + ระยะห่าง -->
  <div class="flex h-screen w-full flex-col overflow-hidden bg-canvas p-6 pb-[5rem]">
    <div
      bind:this={table}
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(16,21,27,0.04),0_1px_3px_rgba(16,21,27,0.06)] transition-opacity duration-150"
      class:opacity-60={switching}
    >
      <HeaderCard {header} color={headerColor} />
      {#if currentSchedule.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-1.5 p-10">
          <p class="text-sm text-ink-2">ไม่มีข้อมูลภาคเรียนนี้</p>
          <p class="text-[13px] text-ink-3">เลือกปีการศึกษาหรือภาคเรียนอื่นจากแถบด้านล่าง</p>
        </div>
      {:else}
        <Grid schedule={currentSchedule} {theme} />
      {/if}
    </div>
  </div>
{:else}
  <div class="kmitl-table pb-[5rem]">
    {@html currentOldHtml}
  </div>
{/if}

<Controls
  bind:mode
  bind:theme
  bind:headerColor
  captureTarget={table}
  portrait={{
    component: StudyExport,
    fittable: true,
    props: { schedule: currentSchedule, header, headerColor, theme },
  }}
  customizable
  onResetTheme={resetTheme}
  {pickerReady}
  {years}
  {semesters}
  {selectedYear}
  {selectedSemester}
  {switching}
  {switchError}
  onSelectTerm={selectTerm}
/>
