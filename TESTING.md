# v1.8 — Verification & Test Checklist

## Tests performed locally

Run:

```bash
node --check assets/app.js
for f in tests/*.test.cjs; do node "$f"; done
```

Browser automated checks with Chromium/Playwright (`python tests/v18-browser.test.py`):
- เพิ่มนักเรียนและลงวันเรียน (ไม่บังคับ) ใน Class Schedule
- มอบหมายคอร์สจากต้นแบบ แล้วได้แพ็กเกจแยกตามนักเรียน
- Manual 18:00–19:30 แสดง 1 ชม. 30 นาทีและหัก 90 นาทีทันที
- เพิ่มรายการ Manual เดิมวันที่/เวลาซ้ำ ถูกปฏิเสธ
- ยกเลิกรายการเดี่ยว คืนชั่วโมง 90 นาที
- ยืนยัน Google Meet สองวันพร้อมกัน → Approved ทั้งสองวัน / Ledger สองแถว / ล้างหน้า Import
- ยกเลิกเฉพาะคนในกลุ่ม คืนให้คนนั้น ไม่คืนให้คนอื่น
- ยกเลิกคาบกลุ่มทั้งหมดต่อ ไม่คืนซ้ำให้คนที่เคยถูกยกเลิก
- Learning Calendar แสดงคาบที่นำเข้าจาก Excel แม้ไม่มีตารางเรียนล่วงหน้า
- Legacy Pending ไม่ถูกตัดอัตโนมัติ แต่ตัดได้ทีละครั้งหลังตรวจสอบ
- ไม่มี uncaught browser JavaScript errors ในชุดทดสอบนี้

## Must verify on live Google Sheets before production

1. Connect OAuth → load Sheets without sharing publicly.
2. Create test student and course; check rows in `Students`, `Courses`, `Ledger`.
3. Create optional schedule; check row in `Schedules`.
4. Record test session; check `Sessions.status=approved`, `Attendance.status=approved`, one negative `Ledger.minutes` for each attendee; balance decreases immediately.
5. Import the two example Excel files; verify different `Sessions.date`, `Imports.date`, names, duration, and total deductions.
6. Reimport same file; verify duplicate guard.
7. Cancel test attendance; verify positive refund ledger and correct remaining balance.
8. Confirm legacy Pending only after reviewing any previous manual adjustments.
9. On mobile, check Student Cards, Class Schedule, Review Summary, and Import Excel.

**Data migration:** No new Google Sheets schema in v1.8; existing Pending rows remain unchanged until explicitly handled.

**Concurrency:** Google's Sheets API in a static front end does not provide application-level multi-user transaction locking; do not assume concurrent user writes are fully protected.
