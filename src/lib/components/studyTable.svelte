<script>
  export let schedule = [];
  export let oldTable = "";
  export let faculty = "";
  export let department = "";
  export let major = "";
  export let semester = "";
  export let year = "";
  export let studentId = "";
  export let studentName = "";
  import { toJpeg } from "html-to-image";

  const days = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
  const englishDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let table = undefined;
  let mode = "new";

  const download = async () => {
    const dataUrl = await toJpeg(table);
    const link = document.createElement("a");
    link.download = "image.png";
    link.href = dataUrl;
    link.click();
  };

  const color = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];

  const makeTheme = () => {
    let theme = [];
    let usedColor = [];
    schedule.forEach((item) => {
      let themeColor = color[Math.floor(Math.random() * color.length)];
      while (usedColor.includes(themeColor)) {
        themeColor = color[Math.floor(Math.random() * color.length)];
      }
      const isAlready = theme.find((t) => item.subjectId === t.subjectId);
      if (isAlready) {
        return;
      }
      theme.push({
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        color: themeColor,
      });
      usedColor.push(themeColor);
    });
    return theme;
  };
  let theme = makeTheme();

  const getTheme = (subjectId) => {
    const filtered = theme.filter((item) => item.subjectId === subjectId);
    if (filtered.length > 0) {
      return filtered[0].color;
    } else {
      return false;
    }
  };

  const createTimeSlot = (day) => {
    const filtered = schedule.filter((item) => item.day === day);
    const timeSlots = [];
    for (let index = 0; index < 12 * 4; index++) {
      timeSlots.push(undefined);
    }
    filtered.forEach((item, index) => {
      const start = item.start.split(":");
      const end = item.end.split(":");
      const startHour = parseInt(start[0]);
      const startMinute = parseInt(start[1]);
      const endHour = parseInt(end[0]);
      const endMinute = parseInt(end[1]);
      const startSlot = (startHour - 8) * 4 + Math.floor(startMinute / 15);
      const endSlot = (endHour - 8) * 4 + Math.floor(endMinute / 15);
      for (let i = startSlot; i < endSlot; i++) {
        timeSlots[i] = {
          subjectName: item.subjectName,
          subjectIndex: index,
          colspan: endSlot - startSlot,
          color: color[Math.floor(Math.random() * color.length)],
          info: item,
        };
      }
    });
    const final = [];
    timeSlots.forEach((item) => {
      if (item === undefined) {
        final.push(undefined);
      } else if (final[final.length - 1] !== undefined) {
        if (final[final.length - 1].subjectIndex !== item.subjectIndex) {
          final.push(item);
        }
      } else {
        final.push(item);
      }
    });
    return final;
  };
  let customizeMenu = false;
  let headerColor = "#f97316";
</script>

{#if mode == "new"}
  <div bind:this={table} class="w-full p-5 flex flex-col justify-center shadow">
    <div
      class="w-full p-4 text-white rounded-t-lg"
      style="background-color: {headerColor};"
    >
      <p class="text-center">{faculty}</p>
      <p class="text-center">{department} {major}</p>
      <p class="text-center">{semester} {year}</p>
      <p class="text-center">{studentId} {studentName}</p>
    </div>
    <table class="shadow w-full h-screen rounded-b-lg bg-white">
      <thead>
        <tr>
          <th class="p-1 font-light" />
          <th class="p-1 font-light" colspan="4">08:00 - 09:00</th>
          <th class="p-1 font-light" colspan="4">09:00 - 10:00</th>
          <th class="p-1 font-light" colspan="4">10:00 - 11:00</th>
          <th class="p-1 font-light" colspan="4">11:00 - 12:00</th>
          <th class="p-1 font-light" colspan="4">12:00 - 13:00</th>
          <th class="p-1 font-light" colspan="4">13:00 - 14:00</th>
          <th class="p-1 font-light" colspan="4">14:00 - 15:00</th>
          <th class="p-1 font-light" colspan="4">15:00 - 16:00</th>
          <th class="p-1 font-light" colspan="4">16:00 - 17:00</th>
          <th class="p-1 font-light" colspan="4">17:00 - 18:00</th>
          <th class="p-1 font-light" colspan="4">18:00 - 19:00</th>
          <th class="p-1 font-light" colspan="4">19:00 - 20:00</th>
        </tr>
      </thead>
      <tbody>
        {#each days as day, index}
          <tr class="hover:bg-slate-100 h-[14.28571%]">
            <td class="p-1">{englishDays[index]}</td>
            {#each createTimeSlot(day) as timeSlot}
              {#if timeSlot === undefined}
                <td class="py-1 w-[2.08333%]" />
              {:else}
                <td
                  class={`py-1 w-[2.08333%] text-white px-0`}
                  colspan={timeSlot.colspan}
                >
                  <div
                    class={`w-full h-full p-1 relative rounded`}
                    style={`background-color: ${
                      theme ? `${getTheme(timeSlot.info.subjectId)}` : "#64748b"
                    }`}
                  >
                    <p class="absolute top-1 text-xs">
                      {timeSlot.info.building}
                      {timeSlot.info.room}
                    </p>
                    <p class="px-1 h-full flex justify-center items-center">
                      {timeSlot.subjectName}
                    </p>
                    <p class="absolute bottom-1 text-xs">
                      Section {timeSlot.info.sec} ({timeSlot.info.type})
                    </p>
                    <p class="absolute bottom-1 right-1 text-xs">
                      {timeSlot.info.start} - {timeSlot.info.end}
                    </p>
                  </div>
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  {@html oldTable}
{/if}

<div class="fixed bottom-3 right-3 flex gap-2">
  {#if mode == "new"}
    <div class="relative">
      {#if customizeMenu}
        <div
          class="absolute bottom-[110%] right-0 p-4 bg-white border shadow rounded-lg flex flex-col gap-2 h-56 w-96 overflow-y-auto"
        >
          <div class="flex flex-col gap-2">
            <p class="text-sm">Theme</p>
            <div class="flex items-center gap-2">
              <div class="relative flex flex-col gap-2">
                <p class="text-sm">Header</p>
                <div class="flex gap-2">
                  <div>
                    <input
                      type="color"
                      bind:value={headerColor}
                      class="absolute opacity-0 w-5 h-5"
                    />
                    <div
                      class={`w-5 h-5 rounded-full`}
                      style={`background-color: ${headerColor}`}
                    />
                  </div>
                  <p class="text-sm">Background Color</p>
                </div>
              </div>
            </div>
            {#each theme as item}
              <div class="flex items-center gap-2">
                <div class="relative flex flex-col gap-2">
                  <p class="text-sm">{item.subjectName}</p>
                  <div class="flex gap-2">
                    <div>
                      <input
                        type="color"
                        bind:value={item.color}
                        class="absolute opacity-0 w-5 h-5"
                      />
                      <div
                        class={`w-5 h-5 rounded-full`}
                        style={`background-color: ${
                          theme ? `${getTheme(item.subjectId)}` : "#64748b"
                        }`}
                      />
                    </div>
                    <p class="text-sm">Background Color</p>
                  </div>
                </div>
              </div>
            {/each}
            <button
              on:click={() => {
                theme = makeTheme();
                headerColor = "#f97316";
              }}
              class=" bg-orange-500 p-2 text-white rounded-lg flex justify-center items-center hover:bg-orange-600 active:bg-orange-400 transition-all cursor-pointer"
              >Reset Theme</button
            >
          </div>
        </div>
      {/if}
      <button
        on:click={() => {
          customizeMenu = !customizeMenu;
        }}
        class=" bg-orange-500 p-2 text-white rounded-full flex justify-center items-center hover:bg-orange-600 active:bg-orange-400 transition-all cursor-pointer"
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
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
          />
        </svg>
      </button>
    </div>
  {/if}
  {#if mode == "new"}
    <button
      on:click={download}
      class=" bg-orange-500 p-2 text-white rounded-full flex justify-center items-center hover:bg-orange-600 active:bg-orange-400 transition-all cursor-pointer"
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
  {/if}
  <button
    on:click={() => {
      mode = mode == "new" ? "old" : "new";
    }}
    class=" bg-orange-500 p-2 text-white rounded-full flex justify-center items-center hover:bg-orange-600 active:bg-orange-400 transition-all cursor-pointer"
  >
    {mode == "new" ? "Old Design" : "New Design"}
  </button>
</div>
