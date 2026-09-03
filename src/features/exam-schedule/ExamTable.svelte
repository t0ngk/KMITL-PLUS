<script>
  let { schedule = [] } = $props();

  const examDate = (date) =>
    new Date(date).toLocaleDateString(["th-TH"], {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const examTime = (time) =>
    new Date(time).toLocaleTimeString(["en-EN"], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  // ตารางนี้ถือ style ของตัวเองด้วย class ที่ประกาศตรง ๆ ไม่พึ่ง selector ระดับ
  // element ของ styles.css — ข้อตกลงเดิมจาก refactor-exam-ui ที่ยังต้องคงไว้
  // เปลี่ยนแค่ token : hairline ของระบบแทน border ทุกด้าน และ ramp 11/13px
  const CELL = "px-3 py-2.5 align-top text-[13px]";
  const META = "tnum whitespace-nowrap text-ink-2";
</script>

<table class="w-full border-collapse">
  <thead>
    <tr class="border-b border-line text-left">
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        วันสอบ
      </th>
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        เวลา
      </th>
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        รหัสวิชา
      </th>
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        ชื่อวิชา
      </th>
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        กลุ่ม
      </th>
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        หน่วยกิต
      </th>
      <th class="px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        ประเภท
      </th>
      <th class="w-56 px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
        ห้องสอบ
      </th>
    </tr>
  </thead>
  <tbody>
    {#each schedule as day, indexDay}
      {#each day.subject as subject, index}
        <!-- เส้นคั่นวางที่ "แถวแรกของแต่ละวัน" จังหวะจึงมาจากการจัดกลุ่มตามวัน
             ไม่ต้องใช้แถบสีสลับอีก -->
        <tr class:border-t={index === 0 && indexDay > 0} class="border-line hover:bg-hover">
          {#if index === 0}
            <td class="{CELL} {META} font-medium text-ink" rowspan={day.subject.length}>
              {#if day.date}
                {examDate(day.date)}
              {:else}
                <span class="text-ink-3">ไม่ทราบ</span>
              {/if}
            </td>
          {/if}
          <td class="{CELL} {META}">
            {#if subject.startTime && subject.endTime}
              {examTime(subject.startTime)}–{examTime(subject.endTime)}
            {:else}
              <span class="text-ink-3">ไม่ทราบ</span>
            {/if}
          </td>
          <td class="{CELL} {META}">{subject.subjectCode}</td>
          <td class="{CELL} font-medium text-ink">{subject.subjectName}</td>
          <td class="{CELL} {META}">{subject.sec}</td>
          <td class="{CELL} {META}">{subject.credit}</td>
          <td class="{CELL} whitespace-nowrap text-ink-2">{subject.examType}</td>
          <!-- หมายเหตุ/ห้องสอบยาวได้มาก : จำกัดความกว้างและตัดเชิงสายตาเท่านั้น
               ข้อความเต็มยังอยู่ใน DOM จึงยังติดไปในภาพที่ export และอ่านได้ด้วย title -->
          <td class="{CELL} text-ink-2">
            <span class="line-clamp-2" title={subject.room}>{subject.room}</span>
          </td>
        </tr>
      {/each}
    {/each}
  </tbody>
</table>
