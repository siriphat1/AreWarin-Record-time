# Tutor OS v2.5.1 · Student Portal integration v1.0.1 — Group Create/Edit UI fix

- Replaced overgrown checkboxes in **สร้างกลุ่มเรียน** and **แก้ไขกลุ่มเรียน** with fixed 18px controls.
- Added compact student rows showing avatar, name, optional school and grade.
- Added search (name, full name, school, grade), selected count and Select/Deselect visible rows.
- Preserved existing `input[name=member]` values and `saveGroup` logic, including `GroupMemberships` and `Audit`.
- Responsive, scrollable list; supports light and dark modes.
- No Google Sheets schema change. Deploy only tutor-os/assets/app.js and tutor-os/assets/style.css. Preserve config.js.

## Testing
See tutor-os/tests/v251-group-form-browser.test.py. All existing JS tests should still pass.
