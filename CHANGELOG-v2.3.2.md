# AreWarin Tutor OS v2.3.2 — Edit dates per uploaded file

- Every successfully read file in **Imported Class Summary** displays a small **แก้วันที่** action under its date, including when the date was auto-detected correctly.
- Clicking **แก้วันที่** opens the native date picker for that row only. Changes are applied only after **บันทึกวันที่**; **ยกเลิก** leaves the original date untouched.
- Missing or conflicting dates are flagged and can be confirmed from the same row.
- Updated dates are stored on that file’s import draft and used during Final Review, Session/Attendance creation, duplicate/overlap checks, Imports and Audit records.
- Editing a date does not modify uploaded file bytes or dates of other files. Already-saved imports cannot be changed here.
- No Google Sheets schema changes. Keep existing `config.js` when deploying.
- Recommended: before final save, verify dates in Final Review. Changes after saving must be made through the appropriate correction process, not this pre-import control.
