# Acceptance Checklist — AreWarin Tutor OS V1

ทดสอบใน Demo ก่อน แล้วทดสอบซ้ำใน Google Sheets Live โดยไม่ใช้ข้อมูลส่วนบุคคลจริง

- [ ] เพิ่มนักเรียนใหม่ และแก้ไขชื่อ/alias
- [ ] สร้างคอร์ส 10 ชั่วโมง → Hour Ledger เพิ่ม 600 นาที
- [ ] เติมชั่วโมงอีก 5 ชั่วโมง → ยอดรวมเพิ่ม 300 นาที
- [ ] ต่อคอร์สรอบ 2 แบบ Transfer → ยอดเก่ากลายเป็น 0 และคอร์สเก่าถูกซ่อน
- [ ] กด `ดูประวัติคอร์สเก่า` → พบคอร์สรอบเก่าและ ledger เดิม
- [ ] ต่อคอร์สแบบ Keep → แพ็กเกจเก่าเป็น Held, ไม่แสดงเป็นคอร์ส Active แต่เลือกใช้งานได้
- [ ] บันทึก Manual ช่วง 18:00–20:00 → Pending 120 นาที
- [ ] บันทึก Manual กลุ่มเลือกสองคน โดย Override นาทีคนละค่า → Pending ต่างกัน
- [ ] Approve → หักชั่วโมงจริงจากคอร์สที่กำหนดแยกรายคน
- [ ] แก้ Approved attendance จาก 120 เป็น 90 นาที → คืน 30 นาทีด้วย ledger adjustment
- [ ] ยกเลิก Approved session → คืนชั่วโมงของคาบนั้นและเก็บประวัติ cancel
- [ ] Import XLSX ตัวอย่าง → อ่านวัน/เวลา/รายชื่อ/ชั่วโมงได้ถูกต้อง
- [ ] กำหนด Tutor time / Student time / Overlap / Custom และตรวจ Preview
- [ ] กด Import ซ้ำไฟล์เดิม → แจ้งเตือน duplicate
- [ ] เพิ่มตารางเรียนประจำทุกสัปดาห์ → แสดงรายการล่วงหน้า 21 วัน
- [ ] Export CSV เปิดด้วย Excel และอ่านภาษาไทยได้
- [ ] Print Report / Save PDF จากหน้าต่างพิมพ์ได้
- [ ] ตรวจ responsive UI ในจอ 375px / 768px / desktop
- [ ] Google Sheets ไม่ได้ตั้งค่า Anyone with the link หรือ Publish to web
- [ ] สำรองฐานข้อมูล Google Drive และทดสอบกู้คืนด้วยสำเนาชีตในพื้นที่ทดสอบ

หมายเหตุ: มีการตรวจ Node.js syntax และ unit test ตรรกะ Ledger/Approve/Cancel/Join-Time แล้ว แต่ต้องทดสอบ UI จริงในเบราว์เซอร์และ OAuth ภายใต้บัญชีผู้ใช้ก่อนนำขึ้นใช้งานจริง
