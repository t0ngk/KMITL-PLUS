/**
 * แปลงสีที่ผู้ใช้เลือก (hex เดียว) เป็นชุดสีบน hue เดียวกัน :
 * tint (พื้นบล็อก) + ink/inkSoft (ตัวหนังสือบน tint) ใช้ในตาราง
 * bar (ขอบ swatch ในเมนูปรับสี) และ solid (พื้นทึบรับตัวหนังสือขาว) ใช้นอกตาราง
 *
 * คำนวณเป็น hex ตายตัวตั้งแต่ตอนนี้ ไม่ใช้ color-mix() ของ CSS เพราะค่าที่ได้
 * ต้องเป็นสีจริงตอน snapdom อ่าน computed style ไปทำ PNG
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hexToRgb(hex) {
  const text = String(hex).trim().replace("#", "");
  const full =
    text.length === 3
      ? text
          .split("")
          .map((char) => char + char)
          .join("")
      : text;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return null;
  }
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

function rgbToHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  return { h: (hue * 60 + 360) % 360, s: saturation, l: lightness };
}

function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sextant = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sextant];
  return (
    "#" +
    [r, g, b]
      .map((channel) =>
        Math.round((channel + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// WCAG relative luminance — ความสว่างที่ตาเห็นจริง ไม่ใช่ค่า l ของ HSL
// เขียวมีน้ำหนัก 0.7152 ส่วนน้ำเงิน 0.0722 : l เท่ากันจึงสว่างไม่เท่ากันเลย
// ตรึง l ไว้ตายตัวเมื่อไหร่ ฝั่งเขียวของวงล้อจะตก contrast ทุกครั้ง
function luminance({ r, g, b }) {
  const channel = (value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(lumA, lumB) {
  const [light, dark] = lumA >= lumB ? [lumA, lumB] : [lumB, lumA];
  return (light + 0.05) / (dark + 0.05);
}

const lumOf = (hsl) => luminance(hexToRgb(hslToHex(hsl)));

/**
 * ไล่ l จากสว่างไปมืดจนได้อัตราส่วนที่ต้องการ แล้วหยุดทันที
 * = สีที่ยังสดที่สุดเท่าที่ยังผ่านเกณฑ์ contrast ของ hue นั้น ๆ
 */
function darkenUntil(h, s, againstLum, ratio) {
  let last = 0.05;
  for (let l = 0.55; l >= 0.05; l -= 0.005) {
    last = l;
    if (contrast(lumOf({ h, s, l }), againstLum) >= ratio) {
      break;
    }
  }
  return hslToHex({ h, s, l: last });
}

const NEUTRAL = {
  tint: "#F2F4F7",
  ink: "#10151B",
  inkSoft: "#3D4753",
  bar: "#7C8894",
};

/**
 * @param {string} hex สีฐานของวิชา (ค่าจาก palette หรือจาก color picker ของผู้ใช้)
 * @returns {{ tint: string, ink: string, inkSoft: string, bar: string }}
 */
export function blockColors(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return NEUTRAL;
  }
  const { h, s } = rgbToHsl(rgb);
  if (s < 0.06) {
    return NEUTRAL;
  }
  // tint ต้องอิ่มพอให้ hue ที่อยู่ใกล้กันยังแยกออกจากกันได้ :
  // บล็อกวิชาไม่มีแถบสีซ้ายแล้ว tint กับหมึกคือสัญญาณสีทั้งหมดที่เหลือ
  const tint = hslToHex({ h, s: clamp(s, 0.6, 0.9), l: 0.92 });
  const tintLum = luminance(hexToRgb(tint));
  // หมึกทั้งสองระดับแก้สมการ contrast จริงกับ tint ของ hue ตัวเอง ไม่ใช่ตรึง l ไว้
  // ข้อความรองใช้ inkSoft ที่ alpha เต็ม ไม่ใช้ opacity (opacity ทิ้ง contrast ที่คำนวณไว้)
  // เป้า 4.8 ไม่ใช่ 4.5 พอดี ๆ : รูปที่ออกทาง snapdom โดนบีบอัดต่อ และการไล่ l
  // ทีละ 0.005 ลงเอยที่ 4.4995 ได้
  return {
    tint,
    ink: darkenUntil(h, clamp(s, 0.45, 0.8), tintLum, 7),
    inkSoft: darkenUntil(h, clamp(s, 0.4, 0.7), tintLum, 4.8),
    bar: hslToHex({ h, s: clamp(s, 0.5, 0.85), l: 0.52 }),
  };
}
