<script>
  // ตารางสอบในภาพแนวตั้ง : การ์ดเรียงลง ไม่ใช่ตารางแปดคอลัมน์ที่หมุน
  // ที่ความกว้าง ~500px แปดคอลัมน์เหลือคอลัมน์ละ 67px ซึ่งใส่ชื่อวิชาไม่ได้เลย
  // ทุกฟิลด์ที่ตารางแนวนอนแสดงยังอยู่ครบ แค่จัดใหม่เป็นสองบรรทัดต่อรายการ
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
</script>

<div class="flex flex-col">
  {#each schedule as day, dayIndex}
    <div class="px-4 py-3" class:border-t={dayIndex > 0} class:border-line={dayIndex > 0}>
      <p class="tnum pb-2 text-[13px] font-medium text-ink">
        {#if day.date}
          {examDate(day.date)}
        {:else}
          <span class="text-ink-3">ไม่ทราบ</span>
        {/if}
      </p>
      <div class="flex flex-col gap-2">
        {#each day.subject as subject}
          <div class="flex gap-3">
            <p class="tnum w-24 shrink-0 text-[11px] text-ink-2">
              {#if subject.startTime && subject.endTime}
                {examTime(subject.startTime)}–{examTime(subject.endTime)}
              {:else}
                <span class="text-ink-3">ไม่ทราบ</span>
              {/if}
            </p>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] leading-tight font-medium break-words text-ink">
                {subject.subjectName}
              </p>
              <p class="tnum pt-0.5 text-[11px] leading-tight text-ink-3">
                {subject.subjectCode} · กลุ่ม {subject.sec} · {subject.credit}
                · {subject.examType}
              </p>
              {#if subject.room}
                <p class="pt-0.5 text-[11px] leading-tight text-ink-2">
                  {subject.room}
                </p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
