# AreWarin Tutor OS v2.0.2 — Auto Date UI Fix

## สิ่งที่เปลี่ยนจาก v2.0.1

- Excel/ชื่อไฟล์เป็นแหล่งวันที่เรียนของแต่ละคาบ โดยระบบอ่านวันที่อัตโนมัติ (เช่น `2026-06-29`).
- หน้า **Student & Meet Matching** ไม่มีช่องแก้วันที่อีกต่อไป เพราะหน้าดังกล่าวใช้จับคู่นักเรียนเท่านั้น.
- ตาราง **Imported Class Summary** แสดงวันที่ของแต่ละไฟล์พร้อมเวลาและสถานะ. **ไฟล์ที่อ่านวันที่ถูกต้องจะไม่มีช่องให้กรอกหรือปุ่มแก้วันที่**.
- หากไฟล์ไม่มีวันที่ หรือข้อมูลใน Excel ไม่ตรงกับชื่อไฟล์ จะปรากฏช่องแก้/ยืนยันเฉพาะแถวไฟล์ที่มีปัญหาบนตารางสรุป.
- แก้ไขวันที่ไฟล์หนึ่งไม่กระทบไฟล์อื่น และรายการวันที่ยังถูกตรวจสอบก่อนบันทึก.
- ไม่มีการเปลี่ยน schema ของ Google Sheets และไม่มีการแก้ข้อมูลเดิมโดยอัตโนมัติ.

## อัปเกรดจาก v2.0.1

1. สำรองไฟล์เว็บไซต์เดิมและ Google Sheets ก่อน.
2. ดาวน์โหลด `AreWarin-Tutor-OS-v2.0.2-update-only.zip` แล้วแตกไฟล์.
3. บน GitHub Pages ให้อัปโหลด `index.html`, `assets/app.js`, `assets/style.css` แทนไฟล์เดิม.
4. **เก็บ `config.js` เดิมไว้** เพราะมีค่า OAuth Client ID และ Spreadsheet ID ของคุณ.
5. รีเฟรชเว็บไซต์แบบ Hard Reload (`Ctrl+Shift+R`).
6. ทดสอบนำเข้าไฟล์ชื่อ `...2026-06-29....xlsx` และตรวจว่าตารางสรุปแสดงวันที่ ส่วนหน้า Matching ไม่มีช่องวันที่.

## พฤติกรรมที่รักษาไว้

- รองรับอัปโหลด Excel หลายไฟล์พร้อมกัน แยกวันเรียนตามแต่ละไฟล์.
- จับคู่ชื่อ Meet กับ Student ID และเลือกรูปแบบคลาส/ชั่วโมงตัด.
- ตรวจ Final Review ก่อนบันทึกและตัดชั่วโมงทันทีเมื่อยืนยัน.
- เก็บประวัติวันที่ใน `Sessions.date` และ `Imports.date`.
- ระบบลงเวลา Manual, รายงาน, Student Cards, Class Schedule และระบบต่อคอร์สยังอยู่.

## การทดสอบ

- `node --check assets/app.js` ผ่าน
- Node regression (`tests/*.cjs`) 6 ชุดผ่าน
- Browser/Playwright `tests/v202-no-duplicate-date-browser.test.py`, `tests/v201-dates-attendance-browser.test.py`, `tests/v20-ui-browser.test.py` และ `tests/v18-browser.test.py` ผ่านกับข้อมูลจำลอง
- **ยังไม่ได้ทดสอบบนบัญชี Google Sheets จริงของผู้ใช้**

## โครงสร้าง

- `index.html` — หน้าเว็บหลัก
- `assets/app.js` — การทำงานของระบบ
- `assets/style.css` — ดีไซน์ responsive
- `config.js` — ค่า Google OAuth/Spreadsheet (ในชุดเต็มเป็นไฟล์ตัวอย่าง)
- `apps-script/Setup.gs` — ติดตั้งโครงสร้าง Google Sheets ในการติดตั้งครั้งแรกเท่านั้น

ข้อควรระวัง: อย่าใส่ Google Client Secret, รหัสผ่านหรือ Access Token ลงใน GitHub Pages และอย่าเปิด Google Sheets เป็น public. ระบบที่ใช้ Google Sheets API ผ่านเบราว์เซอร์โดยตรงยังมีความเสี่ยงเมื่อมีผู้เขียนข้อมูลพร้อมกันหลายคน.
