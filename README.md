# AreWarin Student Portal v1.2.0 + Tutor OS v2.5.5

## ปรับปรุง
- ไม่ต้องกรอกรหัสเชิญ: Student ID + เบอร์มือถือที่ลงทะเบียน + SMS OTP → ตั้ง PIN
- เพิ่มช่องเบอร์โทรในฟอร์มเพิ่ม/แก้ไขนักเรียนและปุ่มแก้เบอร์ใน Portal Manager
- ใช้ระบบ Twilio Verify (ต้องตั้งค่าผู้ให้บริการ SMS ก่อน)
- ขยาย API ให้รองรับเมธอด OTP แบบ 5 อาร์กิวเมนต์
- ป้องกันส่ง OTP ซ้ำถี่เกินไป, ป้องกัน OTP ผิด และรักษา PIN/เซสชันฝั่ง Apps Script
- ไม่แตะประวัติเรียน Ledger หรือ Audit และไม่ส่งประวัติการแก้เวลาให้นักเรียน

อ่าน `docs/INSTALL-TH.md` ก่อนติดตั้ง โดยเฉพาะลำดับ Apps Script → Twilio → Worker → GitHub

## ไฟล์
- `tutor-os-update/index.html` → GitHub root `index.html`
- `student/index.html`, `student/app.js`, `student/api-client.js` → GitHub `student/`
- `apps-script/StudentPortal.gs` → Apps Script Student API โปรเจกต์แยก
- `cloudflare-worker/worker.js` → Worker ตัวกลาง API
- `tests/` → ชุดทดสอบ

**ไม่รวม** `config.js` จริง, Client ID, Spreadsheet ID, คีย์ผู้ให้บริการ SMS และข้อมูลส่วนตัวของนักเรียน
