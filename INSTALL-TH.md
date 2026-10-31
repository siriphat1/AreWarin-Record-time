# ติดตั้ง AreWarin Student Portal v1.2.0 — ยืนยันเบอร์ด้วย SMS OTP

> **สำคัญ:** ก่อนทำ ให้ทำสำเนา Google Sheets และสำรอง `index.html` เดิม ระบบจะยังไม่ส่ง OTP จนกว่าจะตั้งค่า Twilio Verify; ไม่รองรับการใช้เบอร์โทรอย่างเดียวโดยไม่มี OTP เพราะผู้รู้เบอร์อาจสวมสิทธิ์นักเรียนได้

## 1) Apps Script ใหม่สำหรับนักเรียน (ไม่แตะ Code.gs เดิม)

1. ไปที่ Apps Script โปรเจกต์ **AreWarin Student API** ที่สร้างไว้ก่อนหน้านี้
2. จดค่า `PORTAL_SPREADSHEET_ID` จากไฟล์เดิมไว้ จากนั้นนำ `apps-script/StudentPortal.gs` **เวอร์ชันนี้** แทนโค้ดของโปรเจกต์ Student API (ถ้าไฟล์เดิมชื่อ `Code.gs` ให้คงชื่อนั้นไว้ได้)
3. ใส่ `PORTAL_SPREADSHEET_ID = '...';` ให้เป็น ID ของ **Google Sheets เดียวกับ Tutor OS**
4. กด Save → เลือกฟังก์ชัน **`setupStudentPortal`** (ไม่มีขีดล่างท้าย) → Run / อนุญาตสิทธิ์ ระบบจะเพิ่มหัวคอลัมน์ **`phone`** ที่ท้ายชีต `Students` อัตโนมัติ โดยไม่ลบข้อมูลเดิม
5. **Deploy → Manage deployments → Edit (รูปดินสอ) → Version: New version → Deploy**. ปกติ `/exec` เดิมไม่เปลี่ยนเมื่ออัปเดต deployment เดิม

## 2) ตั้งค่า SMS OTP — จำเป็นก่อนเปิดให้นักเรียนใช้

ใช้บริการ **Twilio Verify** ซึ่งมีค่าบริการตามอัตราของผู้ให้บริการและอาจมีข้อกำหนดบัญชีทดลอง เลือก Verify Service ที่รองรับส่ง SMS ไปเบอร์ไทย

ใน Apps Script → **Project Settings** (รูปเฟือง) → **Script properties** → Add script property:

| Property | ค่า | หมายเหตุ |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Account SID ของ Twilio ที่ขึ้นต้น `AC` | เก็บเป็น secret ใน Apps Script เท่านั้น |
| `TWILIO_AUTH_TOKEN` | Auth Token ของ Twilio | ห้ามใส่ใน GitHub / ส่งในแชต |
| `TWILIO_VERIFY_SERVICE_SID` | Verify Service SID ที่ขึ้นต้น `VA` | ของบริการยืนยัน SMS |

กด **Save script properties** แล้วทดสอบส่ง SMS ไปที่เบอร์ทดสอบที่ได้รับอนุญาตก่อน หากยังไม่ตั้งค่าข้างต้น เมื่อกดขอ OTP ระบบจะแจ้งว่า SMS OTP ยังไม่พร้อมใช้งาน **ไม่เปิดให้ตั้ง PIN โดยการเดาเบอร์โทร**

## 3) Cloudflare Worker

เปิด Worker **`arewarin-student-api`** ตัวใหม่ (อย่าแก้ Worker ที่ให้บริการ Tutor OS เดิม) → Edit code → วาง `cloudflare-worker/worker.js` → Deploy

**Variables and Secrets เดิมเก็บไว้:**
- `GAS_URL` = `/exec` ของ Apps Script Student API (Secret)
- `PUBLIC_ORIGIN` = `https://siriphat1.github.io` (Text)

Worker ต้องอัปเดตพร้อมกัน เพราะเวอร์ชันนี้ใช้เมธอด `requestPhoneOtp` และ `activateWithPhone`

## 4) GitHub Pages — อัปเดตสองส่วน

ใน Repository **`AreWarin-Record-time`**:
- **`index.html` ที่ราก Repository** ← แทนด้วย `tutor-os-update/index.html` (Tutor OS v2.5.5)
- **`student/index.html`** ← แทนด้วย `student/index.html`
- **`student/app.js`** ← แทนด้วย `student/app.js`
- **`student/api-client.js`** ← แทนด้วย `student/api-client.js`

`student/style.css` ใช้ไฟล์เดิมได้ ไม่ต้องเปลี่ยน `student/config.js`, `config.js`, Sheets เดิม หรือ `assets/`

กด Commit changes แล้วรีเฟรชแบบไม่ใช้แคช (`Ctrl + Shift + R`)

## 5) กรอกเบอร์โทรและเปิดบัญชี

1. Tutor OS → เชื่อม Google Sheets จริง → **นักเรียนและคอร์ส → Student Portal Manager**
2. คนเดิมที่มี Student ID แล้ว: กด **☎ แก้เบอร์โทร** → ใส่เบอร์ 10 หลัก → บันทึก
3. คนที่ยังไม่มี Student ID: กด **ออกรหัสนักเรียนเดิม** แล้วกรอกเบอร์โทรตามข้อ 2
4. หากบัญชีเคยตั้ง PIN แล้ว แต่ต้องการเริ่มใหม่ ให้ผู้ดูแลกด **รีเซ็ต PIN** ก่อน; รหัสนักเรียนเดิมคงอยู่
5. นักเรียนเปิด `https://siriphat1.github.io/AreWarin-Record-time/student/` → **เปิดใช้งานครั้งแรก** → รหัสนักเรียน + เบอร์โทร → **ส่งรหัส OTP** → กรอก OTP จาก SMS → ตั้ง PIN 4 หลัก

## จุดตรวจเมื่อมีข้อผิดพลาด

- **“ไม่สามารถเข้าสู่ระบบได้”** → ตรวจ `PortalAccounts.student_code` ว่าตรงและ `status=active`, ตรวจ `Students.id` ว่าตรงกับ `PortalAccounts.student_id`, ตรวจเบอร์ใน `Students.phone` และ Spreadsheet ID ทั้งสองโปรเจกต์
- **“ยังไม่ได้ตั้งค่าระบบ SMS OTP”** → ตรวจ Script Properties ของ Student API
- **“ระบบส่ง/ตรวจ OTP ไม่สำเร็จ”** → ตรวจ Twilio Verify Service, สิทธิ์ส่ง SMS เบอร์ไทย และ Apps Script Executions
- **“Method not allowed / Bad request”** → อัปเดต Worker และ Apps Script ให้เป็นไฟล์เวอร์ชันนี้ทั้งคู่ แล้ว Redeploy **New version**
- **หน้าเปิดใช้ยังมีช่องรหัสเชิญ** → อัปโหลด `student/index.html` และ `student/app.js` ให้ครบ รีเฟรชไม่ใช้แคช
- **Tutor OS บันทึกเบอร์ไม่สำเร็จ** → รัน `setupStudentPortal` ให้สร้าง `Students.phone` ก่อน จึงกลับมาบันทึกใหม่

**ความเป็นส่วนตัว:** Student API ไม่คืนเบอร์เต็มให้หน้านักเรียน, ไม่คืน Audit Log หรือประวัติแก้ไขเวลา, และไม่สามารถเปิดบัญชีด้วยแค่รหัสนักเรียน+เบอร์โทรโดยไม่มี OTP ถูกต้อง ตรวจรับเงินจากบัญชีจริงก่อนอนุมัติสลิปเสมอ

**สถานะการทดสอบ:** JavaScript/Chromium + Twilio API จำลองผ่าน; ยังไม่ได้ส่ง SMS จริงหรือเชื่อม Google Sheets/Drive บัญชีของคุณ
