import { blockColors } from "../../shared/colors";
import { thaiDays } from "../../shared/dateNames";
import { getTheme } from "../../shared/theme";

// ตรรกะว่า "วิชาไหนอยู่ตรงไหน" — ใช้ร่วมกันระหว่างกริดแนวนอน (บนจอ) กับแนวตั้ง (ภาพ export)
//
// ที่นี่ไม่มีคำว่าแถวหรือคอลัมน์เลยโดยตั้งใจ : มันรู้แค่ว่าวิชาเริ่มช่องไหน จบช่องไหน
// อยู่วันไหน สีอะไร และซ้อนกับใคร ส่วนจะเอาไปวางเป็นแกนนอนหรือแกนตั้งเป็นเรื่องของผู้วาด
//
// ที่แยกออกมาเพราะส่วนนี้คือส่วนที่ "หลุดจากกันแบบเงียบ ๆ" ได้ ถ้าเขียนสองชุด —
// ตารางสองใบที่วางวิชาคนละที่จะไม่มีอะไรฟ้อง ต่างจาก markup ที่ต่างกันแล้วเห็นทันที
// (adopt-e2e-suite ก็เจอแบบนี้มาแล้วกับ walk สองชุด)

// ช่อง 15 นาทีเป็นหน่วยของการวางบล็อก เส้นที่วาดจริงมีแค่ขอบชั่วโมง
export const SLOTS_PER_HOUR = 4;

// แกนเวลาเต็ม 08:00-20:00 : ทุกภาคเรียนอ่านที่ตำแหน่งเดิม และรูปที่ export ออกไป
// เทียบกันได้ตรง ๆ ตารางที่เรียนไม่เต็มช่วงจึงมีช่องว่างโดยตั้งใจ
export const FULL_START_HOUR = 8;
export const FULL_HOUR_COUNT = 12;

const minutesOf = (time) => {
  const [hour, minute] = time.split(":");
  return parseInt(hour) * 60 + parseInt(minute);
};

/** ขอบเขตเต็ม : ทั้งสัปดาห์ 08:00-20:00 ไม่ว่าภาคเรียนนั้นจะเรียนแค่ไหน */
export function fullExtent(schedule = []) {
  const used = new Set(schedule.map((item) => item.dayIndex));
  return {
    startHour: FULL_START_HOUR,
    hourCount: FULL_HOUR_COUNT,
    days: thaiDays.map((_, dayIndex) => ({
      dayIndex,
      used: used.has(dayIndex),
    })),
  };
}

/**
 * ขอบเขตเท่าที่ภาคเรียนนี้ใช้จริง
 *
 * ชั่วโมง : ตัดหัวและท้ายที่ไม่มีคาบแตะ (ไม่มีเทอมไหนใน corpus เริ่มก่อน 09:00)
 * วัน     : ตัดวันว่างที่ต้นและท้ายสัปดาห์ แต่ **คงวันว่างที่อยู่ตรงกลางไว้**
 *           เพราะคนอ่านรูปทรงก่อนอ่านป้าย — ยุบวันอังคารที่ว่างทิ้งแล้ว จ.พ.พฤ.ศ.
 *           จะอ่านเป็น "เรียนสี่วันติด" ซึ่งไม่จริง
 */
export function fitExtent(schedule = []) {
  if (schedule.length === 0) {
    return fullExtent(schedule);
  }

  const startHour = Math.floor(
    Math.min(...schedule.map((item) => minutesOf(item.start))) / 60,
  );
  const endHour = Math.ceil(
    Math.max(...schedule.map((item) => minutesOf(item.end))) / 60,
  );

  const used = new Set(schedule.map((item) => item.dayIndex));
  const usedList = [...used].sort((a, b) => a - b);
  const first = usedList[0];
  const last = usedList.at(-1);

  return {
    startHour,
    hourCount: Math.max(1, endHour - startHour),
    days: thaiDays
      .map((_, dayIndex) => ({ dayIndex, used: used.has(dayIndex) }))
      .filter((day) => day.dayIndex >= first && day.dayIndex <= last),
  };
}

/**
 * จัดวิชาลงช่องตามขอบเขตที่ให้มา
 *
 * คืน [{ dayIndex, used, cards: [{ item, colors, slotStart, slotEnd, slotSpan,
 *        lane, laneCount, label }] }]
 *
 * slotStart/slotEnd นับจาก extent.startHour เริ่มที่ 0 — ผู้วาดบวก offset ของตัวเอง
 * lane/laneCount บอกว่าคาบนี้ซ้อนกับคาบอื่นกี่ชั้นและอยู่ชั้นไหน สำหรับผู้วาดที่ไม่มี
 * ที่ให้ซ้อน (แนวตั้ง : คอลัมน์วันเดียวกว้างเท่านั้น) ส่วนแนวนอนวางตามเวลาได้อยู่แล้ว
 */
export function layoutWeek(schedule, theme, extent) {
  const slotOf = (time) =>
    Math.floor((minutesOf(time) - extent.startHour * 60) / 15);
  const slotCount = extent.hourCount * SLOTS_PER_HOUR;

  return extent.days.map((day) => {
    const cards = schedule
      .filter((item) => item.dayIndex === day.dayIndex)
      .map((item) => {
        const slotStart = slotOf(item.start);
        const slotEnd = slotOf(item.end);
        return {
          item,
          colors: blockColors(getTheme(theme, item.subjectId)),
          slotStart,
          slotEnd,
          slotSpan: slotEnd - slotStart,
          label: `${item.subjectName} ${item.start}–${item.end}`,
        };
      });

    return { ...day, slotCount, cards: assignLanes(cards) };
  });
}

// จัดชั้นให้คาบที่เวลาซ้อนกัน : คาบที่ไม่ชนใครได้ laneCount 1 เหมือนเดิม
// กลุ่มที่ชนกันจะได้ lane 0..n-1 และ laneCount เท่ากันทั้งกลุ่ม เพื่อให้ผู้วาด
// แบ่งความกว้างได้เท่า ๆ กันโดยไม่ต้องคำนวณเอง
function assignLanes(cards) {
  const ordered = [...cards].sort(
    (a, b) => a.slotStart - b.slotStart || a.slotEnd - b.slotEnd,
  );

  const result = [];
  let group = [];
  let groupEnd = -1;

  const flush = () => {
    for (const entry of group) {
      result.push({ ...entry.card, lane: entry.lane, laneCount: group.length });
    }
    group = [];
    groupEnd = -1;
  };

  for (const card of ordered) {
    if (group.length > 0 && card.slotStart >= groupEnd) {
      flush();
    }
    group.push({ card, lane: group.length });
    groupEnd = Math.max(groupEnd, card.slotEnd);
  }
  flush();

  // คืนลำดับเดิมของ schedule ไว้ : กริดแนวนอนวาดทับกันตามลำดับนั้นมาตลอด
  return cards.map((card) =>
    result.find((entry) => entry.item === card.item),
  );
}
