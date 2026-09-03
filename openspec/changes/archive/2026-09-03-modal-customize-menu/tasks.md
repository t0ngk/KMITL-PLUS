# Tasks — modal-customize-menu

Reference: `proposal.md` (the measurement), `design.md` (the three decisions). No spec deltas — `skip_specs: true`; the requirement already exists and this makes the code match it.

The acceptance check is a test that already exists and already fails: `Clicking outside closes the menu` in `e2e/theme-customize.spec.js`. It is not edited by this change.

## 1. Baseline

- [x] 1.1 Confirm the failure before touching anything: run the one test and verify it fails on its assertion, and that the reason is the toggle beneath activating rather than the menu staying open.

## 2. The layer

- [x] 2.1 Bind `Popover.Root`'s open state in `CustomizeMenu.svelte` (design.md decision 2). Verify the menu still opens, closes and traps focus exactly as before.
- [x] 2.2 Render the invisible layer inside the portal while open, at `z-[59]` between the dock and the content (design.md decisions 1 and 3). Verify a click inside the menu still works — colour controls and reset are above the layer, not behind it.
      รอบแรกไม่ใส่ onclick ตาม design เดิมที่เดาว่า bits-ui จะยิง interact outside ให้
      ผลคือคลิกถูกกินแต่**เมนูไม่ปิด** (`toHaveCount(0)` ได้ 1) — ชั้นนี้อยู่ใน Portal
      ไลบรารีจึงนับเป็น "ข้างใน" แก้ design decision 1 แล้วให้ชั้นนี้สั่งปิดเอง

## 3. Verify

- [x] 3.1 Verify `Clicking outside closes the menu` passes, and that it passes because the click was swallowed — check the toggle did not fire, not merely that the menu closed.
- [x] 3.2 Verify the other nine `theme-customize` scenarios still pass, especially Escape, keyboard reach and the announced state, since they all touch the same component.
- [x] 3.3 Verify `image-export` stays green: the layer must never be inside the capture frame, and the exported PNG must be unchanged in size and content.
- [x] 3.4 Negative control: remove the layer, confirm the test fails again for the original reason, restore.
- [x] 3.5 Run `pnpm e2e` (both projects), `pnpm e2e:coverage`, `pnpm lint` and `pnpm build`.

## 4. Close the loop

- [x] 4.1 Mark `adopt-e2e-suite` task 4.12 complete, recording that it needed this change rather than pretending it was always green.
- [x] 4.2 Record in `openspec/config.yaml` that the customize menu is modal for the mouse as well as the keyboard, and that `bits-ui` has no prop for this — so the layer is not redundant with a library setting and must not be deleted as such.

## ผลการเดินล่าสุด

```
   pnpm e2e --project=preview     45 ผ่าน   34.8 วิ
   pnpm e2e --project=extension   12 ผ่าน   45.7 วิ
   pnpm e2e:coverage              45/45
   pnpm lint สะอาด · pnpm build 1.27 MB
```

- negative control : ถอดชั้นกันคลิกออก -> test ตกที่บรรทัด 145 (`getByRole("button",
  { name: "แบบเดิม" })` หาไม่เจอ เพราะปุ่มถูกกดจริงแล้วเปลี่ยนป้ายเป็น "แบบใหม่")
  ซึ่งคือ defect เดิมเป๊ะ ไม่ใช่ตกด้วย timeout
- ตัวเทสต์เปลี่ยนวิธีคลิกจาก `locator.click()` เป็น `page.mouse.click()` ที่พิกัดของปุ่ม
  เพราะ `locator.click()` รอจนปุ่มรับคลิกได้ ซึ่งจะไม่มีวันเกิดเมื่อมีชั้นกันคลิก
  การเล็งพิกัดคือสิ่งที่ scenario บรรยายจริง ("clicks anywhere outside it") และ
  assertion แข็งขึ้นด้วย : ตรวจตรง ๆ ว่าปุ่มไม่ทำงาน ไม่ใช่แค่เมนูปิด
