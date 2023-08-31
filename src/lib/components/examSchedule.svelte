<script>
  import { toPng } from "html-to-image";

  export let schedule;
  export let data;

  let form;
  let table;
  let downloading = false;

  const download = async () => {
    downloading = true;
    const dataUrl = await toPng(table);
    downloading = false;
    const link = document.createElement("a");
    link.download = "image.png";
    link.href = dataUrl;
    link.click();
  };
</script>

<div
  class="w-full min-h-screen flex flex-col justify-center items-center bg-slate-100 text-slate-900"
>
  <div class="w-10/12 bg-slate-100" bind:this={table}>
    <div class="w-full border p-4 text-slate-900">
      <p class="text-center">{data.faculty}</p>
      <p class="text-center">{data.departmentAndProgramme}</p>
      <p class="text-center">{data.semesterAndYear}</p>
      <p class="text-center">{data.studentInfo}</p>
      <form
        bind:this={form}
        on:change={() => {
          form.submit();
        }}
        action="report_examtable_show.php"
        method="post"
      >
        <input type="hidden" name="year" id="year" value={data.year} />
        <input
          type="hidden"
          name="semester"
          id="semester"
          value={data.semester}
        />
        <input
          type="hidden"
          name="student_id"
          id="student_id"
          value={data.student_id}
        />
        {#if !downloading}
        <select name="mid_or_final" class="bg-slate-100" value={data.term}>
          <option value="M">Mid Term</option>
          <option value="F">Final</option>
        </select>
        {:else}
          <span>
            {data.term === "M" ? "Mid Term" : "Final"}
          </span>
        {/if}
      </form>
    </div>
    <table class="w-full">
      <tbody>
        {#each schedule as day, indexDay}
          {#each day.subject as subject, index}
            <tr class="border font-light text-sm" class:bg-slate-200={indexDay % 2 == 1}>
              {#if index === 0}
                <td class="p-2 whitespace-nowrap" rowspan={day.subject.length}>
                  {#if day.date}
                    {new Date(day.date).toLocaleDateString(["th-TH"], {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  {:else}
                    <span>ไม่ทราบ</span>
                  {/if}
                </td>
              {/if}
              <td class="p-2 whitespace-nowrap">
                {#if subject.startTime && subject.endTime}
                  {new Date(subject.startTime).toLocaleTimeString(["en-EN"], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })} - {new Date(subject.endTime).toLocaleTimeString(["en-EN"], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                {:else}
                  <span>ไม่ทราบ</span>
                {/if}
              </td>
              <td class="p-2 whitespace-nowrap">
                {subject.subjectCode}
              </td>
              <td class="p-2 whitespace-nowrap">
                {subject.subjectName}
              </td>
              <td class="p-2 whitespace-nowrap">
                {subject.sec}
              </td>
              <td class="p-2 whitespace-nowrap">
                {subject.credit}
              </td>
              <td class="p-2 whitespace-nowrap">
                {subject.examType}
              </td>
              <td class="p-2">
                {subject.room}
              </td>
            </tr>
          {/each}
        {/each}
      </tbody>
    </table>
  </div>

  <button
    class="border p-2 absolute bottom-4 right-4 transition-all outline outline-0 outline-slate-200 hover:outline-2 hover:shadow-lg active:bg-slate-200"
    on:click={download}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="w-6 h-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  </button>
  <!-- <Credit /> -->
</div>
