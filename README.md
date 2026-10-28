# AreWarin Tutor OS v1.7.1 — Mandatory Class Date Confirmation

## สำคัญ: วันที่เรียนจะต้องแสดงและตรวจสอบได้ทุกคาบ

- หน้าต่าง Final Confirmation เพิ่ม **ช่วงวันที่เรียน** และยอด **จำนวนวันเรียนที่ไม่ซ้ำ**
- เพิ่มคอลัมน์ **วันที่เรียน** เป็นคอลัมน์แรกในตาราง พร้อมวันที่แบบไทยและ ISO (`YYYY-MM-DD`) ชัดเจนทุกแถว
- มีส่วนสรุปแยกตามวัน (กดขยายได้) แสดงจำนวนรายการ นักเรียน และนาทีที่จะตัดแต่ละวัน
- ป้องกันการเปิดหน้ายืนยันถ้ารายการใดไม่มีวันเรียนหรือวันผิดรูปแบบ
- ป้องกันการอนุมัติ Pending เก่าที่ไม่มีวันที่ที่ถูกต้อง
- ยืนยันว่าระบบบันทึกวันเรียนลง `Sessions.date` **แยกตามแต่ละคาบ** และ `Imports.date` **แยกตามไฟล์**; `Attendance.session_id` อ้างอิงไปยังคาบที่มีวันที่ (ไม่เพิ่มคอลัมน์ซ้ำใน Attendance)
- เมื่ออัปโหลด Excel หลายไฟล์ ระบบใช้วันที่ของ **แต่ละไฟล์** ไม่มีการเอาวันของไฟล์แรกไปใช้กับทุกคาบ
- ชื่อไฟล์จะใช้เป็นแหล่งวันที่เมื่อ Excel ไม่มีวันที่; วันที่ที่ขัดแย้งต้องให้ผู้ใช้ยืนยันเองก่อนบันทึก
- โหมด Pending ไม่ตัดชั่วโมง จึงแสดงชั่วโมงคงเหลือเป็นยอดคาดการณ์ ณ ขั้นอนุมัติเท่านั้น

## อัปเกรดจาก v1.7

1. สำรองฐานข้อมูล Google Sheets และไฟล์เว็บเดิม
2. อัปโหลด `index.html`, `assets/app.js`, `assets/style.css` ทับไฟล์ GitHub Pages เดิม
3. **เก็บ `config.js` เดิมไว้** (ไม่ได้เปลี่ยน Google OAuth หรือ Spreadsheet ID)
4. ไม่ต้องรัน `setupTutorOS` ใหม่ เพราะ schema ไม่เปลี่ยน
5. ทดสอบด้วย Excel 2–3 วันที่ต่างกัน กดบันทึกหลายไฟล์ ตรวจว่าหน้า Final Confirmation แสดงวันที่ทุกแถว และตรวจใน Google Sheets แท็บ Sessions + Imports

ไม่แก้ข้อมูลเก่าอัตโนมัติ หากมีรายการเก่าที่บันทึกวันที่ผิด ควรตรวจสอบและแก้ไขจากข้อมูลต้นฉบับก่อน อย่าแก้คาบเรียนหรือ Ledger โดยไม่มีการสำรองข้อมูล

# AreWarin Tutor OS v1.7 — Smart Import & Learning History

## สิ่งที่เปลี่ยนจาก v1.6.1

- หน้า **Import Excel** จัดใหม่เป็น 5 ขั้นตอนเรียงจากบนลงล่าง: Upload → **Imported Class Summary** (ตารางทุกไฟล์และวันที่) → **Class Configuration** (ตั้งค่าในจุดเดียว) → Student & Meet Matching (ตาราง) → **Final Review Summary**
- ตารางรายงานแสดงวันที่เรียน ช่วงเวลาเข้า–ออกของติวเตอร์ เวลาที่เข้าร่วมจริง จำนวนนักเรียน ชื่อไฟล์ ที่มาของวันที่ และสถานะตรวจสอบ พร้อมเลือกไฟล์หลายไฟล์ก่อนบันทึก
- **การตรวจวันที่:** ตรวจวันที่ที่ระบุใน Excel ก่อน (ถ้ามี) ถ้าไม่มีใช้วันที่จากชื่อไฟล์ ถ้าไม่พบหรือข้อมูลขัดแย้ง ผู้ดูแลต้องตรวจสอบ/กำหนดวันก่อนบันทึก ไม่เดาว่าเป็นวันปัจจุบัน
- **Class Configuration** รวมค่าเดิมที่เคยซ้ำกัน (เดี่ยว/กลุ่ม, วิธีเลือกเวลา, เลือก/ยืนยันชื่อนักเรียน) และแสดงเฉพาะช่องจำเป็น; สามารถใช้ค่าเดียวทั้งชุดไฟล์หรือไฟล์เดียวได้
- **ป้องกันการเลือกผิด:** หากอ้างอิงเวลาจากผู้เข้าร่วมคนใดคนหนึ่ง ต้องตั้งทีละไฟล์ (ลำดับรายชื่ออาจต่างกัน)
- ตารางชื่อนักเรียนกะทัดรัดกว่าเดิม มีการจับคู่ชื่อ Meet เลือกแพ็กเกจ นาทีที่จะตัด และรายละเอียดการจดจำชื่ออยู่ในแถวเดียวกัน
- **Learning History** (เมนูใหม่) กรองวันเริ่ม/สิ้นสุด ติวเตอร์ นักเรียน กลุ่ม คอร์ส และสถานะ แสดงแบบตารางหรือกลุ่มตามวัน พร้อมเปิด Session Details
- หน้าสรุปยืนยันก่อนบันทึกยังเป็น **ขั้นตอนบังคับ** ทั้ง Manual, Excel และ Approve; บันทึกไฟล์เป็น Pending ก่อนอนุมัติตัดชั่วโมงจริง
- ยังคงฟังก์ชัน v1.6.1 เช่น นักเรียนแบบการ์ด ต่อคอร์ส เก็บประวัติ Meet Aliases กลุ่มเรียน ตารางสอน รายงาน และการเชื่อม Google Sheets

## วิธีอัปเกรดจาก v1.6.1

1. **สำรอง Google Sheets และไฟล์เว็บเดิม** ก่อนอัปเกรด
2. แตก ZIP และนำ `index.html`, `assets/app.js`, `assets/style.css` ไปแทนไฟล์เดิมที่ GitHub Pages
3. **เก็บ `config.js` เดิมไว้** เพื่อไม่ให้ Client ID และ Spreadsheet ID ที่ตั้งค่าหายไป (ZIP ใหม่มีไฟล์ `config.js` ตัวอย่างว่างเพื่อใช้ติดตั้งใหม่)
4. ไม่ต้องสร้าง Google Sheets ใหม่ และ **ไม่ต้องรัน Apps Script setup ใหม่** ในการอัปเกรด v1.6.1 → v1.7 เพราะยังไม่มีการแก้ Schema
5. รีเฟรชเว็บไซต์ แล้วเลือกเมนู **Import Excel** หรือ **Learning History**
6. ทดสอบด้วยข้อมูลจำลองหรือชีตสำหรับทดสอบก่อนใช้กับข้อมูลนักเรียนจริง

## ข้อจำกัดและความหมายของชั่วโมง

- เวลาของติวเตอร์ที่แสดงบนหน้าสรุปหมายถึง **เวลาอยู่ใน Google Meet ตามรายงาน** ไม่ใช่ชั่วโมงที่ตัดแพ็กเกจนักเรียน
- หากมีไฟล์หลายชุดของคาบเดียวกันหรือช่วงเวลาซ้อนกัน **ยอดเวลาติวเตอร์รวมจากไฟล์อาจนับซ้ำ**; การบันทึกจะตรวจการชนกันของนักเรียนและไฟล์ซ้ำ
- ใน Learning History คอลัมน์ชั่วโมงสอนใช้ช่วงเวลาเริ่ม–สิ้นสุดของคาบที่บันทึก และยอดตัดเป็นผลรวมรายการที่ได้รับอนุมัติแล้ว จึงอาจแตกต่างกันสำหรับเรียนกลุ่ม
- การแสดงเวลาหลายช่วงจาก Google Meet จะรวมช่วงที่ทับซ้อนกัน เพื่อไม่ให้นับซ้ำสำหรับคนเดียวกัน
- การอ่านไฟล์ Excel ในเว็บยังต้องโหลด SheetJS จาก CDN และเข้าสู่ระบบ Google ตามสิทธิ์ที่ตั้งไว้ ไม่ใช่การเชื่อม Google Sheets จริงโดยอัตโนมัติโดยไม่อนุญาต OAuth

## ทดสอบ

- `node tests/v17-import-dates.test.cjs` ทดสอบวันที่จาก Excel/ชื่อไฟล์, วันที่ขัดแย้ง, วันที่หาย, เวลาเข้าร่วมหลายช่วง
- `node tests/smoke.test.cjs` และไฟล์ทดสอบ `.cjs` อื่นในโฟลเดอร์ tests ยืนยันการทำงานเดิม
- ทดสอบ UI บน Chromium ที่ความกว้าง 1440px และ 390px กับชุดข้อมูลจำลอง (ตารางสรุป, config, bulk, confirmation, history)
- **ยังไม่ได้ทดสอบ Google Sheets API กับบัญชีจริง** และไม่ได้ Deploy เว็บไซต์ให้โดยตรง

---

# v1.6.1 — Bulk Actions typography hotfix

- ปรับฟอนต์ข้อความ “จดจำชื่อ Meet ที่ได้รับการจับคู่ของรายการที่เลือก” ให้เหลือ 12px และจัดแนวกับ Checkbox
- รองรับจอเล็กโดยให้ข้อความตัดบรรทัดและไม่ล้นขอบ
- เพิ่ม query string `?v=1.6.1` ใน `index.html` เพื่อให้ GitHub Pages โหลด CSS ใหม่ ไม่ใช้ไฟล์จากแคช
- ไม่มีการเปลี่ยน JavaScript หรือโครงสร้าง Google Sheets จาก v1.6

## อัปเดตเฉพาะจุดจาก v1.6

แทนที่ `assets/style.css` และ `index.html` บน GitHub Pages ด้วยเวอร์ชัน 1.6.1 โดยเก็บ `config.js` เดิมไว้ ไม่ต้องรัน Apps Script ซ้ำ

---

# AreWarin Tutor OS — GitHub Pages + Private Google Sheets

**Version:** 1.6.1 MVP · **UI:** Thai / English · **Timezone:** Asia/Bangkok · **Style:** Academic Minimal / Forest Green

เว็บแอปจัดการนักเรียน คอร์ส ชั่วโมงคงเหลือ การต่อคอร์ส การลงเวลาเรียนรายบุคคล/กลุ่ม และอ่าน Google Meet attendance Excel (.xlsx/.xls/.csv) ตามไฟล์ตัวอย่างที่ให้มา

> **สำคัญ:** ไฟล์นี้เป็นซอร์สโค้ดที่เปิดทดลองได้ทันที (Demo Mode) แต่การเชื่อม Google Sheets จริงต้องตั้งค่า Google Cloud OAuth และอนุญาตให้แอปเข้าถึง Google Sheet ของคุณก่อน ซึ่งยังไม่สามารถทำจากไฟล์ที่ดาวน์โหลดอย่างเดียวได้

## โครงสร้างโฟลเดอร์

```text
arewarin-tutor-os/
├── index.html                 # หน้าเว็บสำหรับ GitHub Pages
├── config.js                  # Client ID และ Spreadsheet ID (กรอกเอง)
├── assets/
│   ├── app.js                 # ฟังก์ชัน UI / Sheets API / Attendance / Import
│   └── style.css              # Responsive Academic Minimal UI
├── apps-script/
│   └── Setup.gs               # สร้างชีตฐานข้อมูล + Backup
├── samples/
│   ├── sample-meet-report.csv # ข้อมูลสมมติสำหรับทดสอบ
│   └── sample-meet-report.xlsx
├── README.md
└── TESTING.md
```

**ไม่มีการแนบข้อมูลนักเรียนจริงจากไฟล์ตัวอย่างที่คุณอัปโหลด** ไฟล์ใน `samples/` เป็นข้อมูลสมมติทั้งหมด

## วิธีเปิดทดลอง (Demo Mode)

1. เปิด `index.html` ใน Chrome/Edge หรืออัปโหลดขึ้น GitHub Pages ได้ทันที
2. เมื่อยังไม่ตั้งค่าระบบ หน้าแรกจะแสดงคำแนะนำตั้งค่า Google Sheets แทนข้อมูลจำลอง; หากต้องการทดลอง ให้กด **ทดลองข้อมูลจำลอง** แล้วจะมีข้อมูล A/B
3. เพิ่มนักเรียน, สร้างคอร์ส, ต่อคอร์ส, ลงเวลา, Approve/Refund และดูรายงานได้
4. ข้อมูลทดลองบันทึกเฉพาะใน `localStorage` ของเบราว์เซอร์ที่เปิดแอป **ไม่ใช่ Google Sheets**; เปลี่ยนเครื่อง/เบราว์เซอร์ไม่ได้รับข้อมูลเดียวกัน

สำหรับทดสอบ Excel แนะนำให้เปิดผ่าน GitHub Pages/เว็บเซิร์ฟเวอร์ HTTPS และเชื่อมต่ออินเทอร์เน็ต เพื่อโหลดไลบรารี SheetJS จาก CDN ก่อน

## วิธีติดตั้งเพื่อใช้งานจริงกับ Google Sheets

### 1. สร้าง Private Google Spreadsheet

- เปิด Google Sheets สร้าง Spreadsheet ใหม่ เช่น `AreWarin Tutor OS Database`
- **ห้าม** Publish to web หรือเปิดแชร์เป็น `Anyone with the link` เพื่อเก็บข้อมูลนักเรียน
- เข้า `Extensions → Apps Script`
- วางเนื้อหาจากไฟล์ `apps-script/Setup.gs` แทนโค้ดเริ่มต้น แล้ว Save
- เลือกฟังก์ชัน `setupTutorOS` แล้วกด **Run** ยอมรับสิทธิ์ที่ Google แจ้ง
- ระบบจะสร้างชีตทั้งหมด 14 แท็บ โดยเพิ่ม `MeetAliases`, `GroupMemberships`, `ClassRules` และ `CoursePolicies` จากโครงสร้างเดิม
- คัดลอก Spreadsheet ID จาก URL รูปแบบ `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
- สคริปต์นี้ใช้เฉพาะติดตั้งฐานข้อมูลและสำรองข้อมูล ไม่ต้อง Deploy เป็น Web app

### 2. ตั้งค่า OAuth ใน Google Cloud

1. เปิด Google Cloud Console และสร้างหรือเลือก Project ของคุณ
2. ไปยัง `APIs & Services → Library` แล้วเปิดใช้ **Google Sheets API**
3. ตั้งค่า **OAuth consent screen** ให้เหมาะสมกับบัญชีผู้ใช้ (หากอยู่ใน Testing ให้เพิ่มบัญชีของคุณใน Test users)
4. สร้าง **OAuth Client ID** ชนิด **Web application**
5. เพิ่ม **Authorized JavaScript origins** ให้ตรงกับเว็บไซต์ เช่น:
   - `https://YOUR_USERNAME.github.io`
   - `http://localhost:8000` (กรณีทดสอบผ่านเครื่องตัวเอง)
6. คัดลอก OAuth **Client ID** (ลงท้าย `.apps.googleusercontent.com`)

> Google OAuth origin เป็น domain เท่านั้น ไม่รวม path ของ repository เช่น `/arewarin-tutor-os` ใช้ domain `https://YOUR_USERNAME.github.io` แทน

### 3. กรอก `config.js`

```js
window.TUTOR_CONFIG = {
  googleClientId: 'YOUR_WEB_OAUTH_CLIENT_ID.apps.googleusercontent.com',
  spreadsheetId: 'YOUR_PRIVATE_GOOGLE_SPREADSHEET_ID',
  appName: 'AreWarin Tutor OS',
  timezone: 'Asia/Bangkok'
};
```

`googleClientId` และ `spreadsheetId` เป็นตัวระบุที่ใช้ฝั่งเว็บ ไม่ใช่รหัสผ่าน แต่ห้ามใส่ `client_secret`, password, service-account JSON หรือ access token ลงไฟล์ที่เผยแพร่บน GitHub

### 4. นำขึ้น GitHub Pages

1. สร้าง repository ใน GitHub (เช่น `arewarin-tutor-os`)
2. อัปโหลดไฟล์ `index.html`, `config.js`, `assets/` และไฟล์อื่นที่จำเป็น โดยให้ `index.html` อยู่โฟลเดอร์หลัก
3. ไป `Settings → Pages → Build and deployment → Deploy from a branch → main / (root)`
4. เปิด URL `https://YOUR_USERNAME.github.io/arewarin-tutor-os/`
5. เปิดหน้าแรก หาก `config.js` ยังว่าง ให้กด **ตั้งค่า Google Sheets** และกรอก OAuth Web Client ID กับ Spreadsheet ID (หรือ URL) **ครั้งเดียว**; ระบบจะจำค่าตัวระบุนี้ไว้บนเครื่องดังกล่าว
6. กด **เชื่อมบัญชี Google** เพื่ออนุญาตแอปเข้าถึง Google Sheets ที่มี **Editor access**
7. หลังเชื่อมสำเร็จ เปิด Dashboard และทดสอบเพิ่มนักเรียน 1 คนก่อนใช้ข้อมูลจริง

เมื่อ Sign in Google จะออก access token ระยะสั้นให้เบราว์เซอร์และ API จะใช้สิทธิ์ Google Sheets ของบัญชีที่เลือก โดยไม่ต้องเปิดชีตสาธารณะ


## การแสดงการ์ดนักเรียนและข้อมูลการศึกษา (v1.4)

- เปิด **Students & Courses** ดูแบบการ์ดเป็นค่าเริ่มต้น หรือสลับเป็น Table View
- แต่ละการ์ดแสดงชื่อเล่น ชื่อจริง โรงเรียน ระดับชั้น ปีการศึกษา คอร์สปัจจุบัน ชั่วโมงคงเหลือ ชื่อ Meet ที่จำได้ และกลุ่มเรียน
- ปุ่ม **แก้ไข** ใช้เปลี่ยนข้อมูลนักเรียนได้; เมื่อเปลี่ยนโรงเรียน/ระดับชั้น/ปีการศึกษา จะบันทึกประวัติใน `StudentEducationHistory` โดยไม่เปลี่ยน Student ID หรือชั่วโมงเรียน
- ช่องค้นหาและตัวกรองตามชั้นเรียนและสถานะมีทั้งในมุมมองการ์ดและตาราง
- ใน Apps Script ให้รัน `setupTutorOS()` อีกครั้ง **หลังสำรองชีตเดิม** เพื่อเพิ่มคอลัมน์ `Students` และชีต `StudentEducationHistory` โดยไม่ลบข้อมูลเดิม

## การเปิดใช้งานอัตโนมัติหลังตั้งค่าครั้งแรก (v1.4)

1. เปิด GitHub Pages หลังอัปเดต v1.4; หากไม่มีตัวระบุใน `config.js` หน้าตั้งค่าจะแสดงขึ้นมาแทน Demo
2. เปิด Connection Settings, กรอก **OAuth Web Client ID** และ **Spreadsheet ID หรือ URL** แล้วบันทึก (จำค่าตัวระบุไว้บนอุปกรณ์นั้น)
3. กด **เชื่อมบัญชี Google** ครั้งแรก เพื่อให้ Google ยืนยันบัญชีและขอสิทธิ์
4. ภายในแท็บเดิม ตราบเท่าที่ session token ยังไม่หมดอายุ กด Refresh ได้โดยระบบกลับไปอ่านชีตจริงอัตโนมัติ
5. หลัง token หมดอายุ/เปิดแท็บหรือ browser session ใหม่ ระบบแสดง **เชื่อมบัญชี Google** โดยตรง ไม่ต้องเข้าสู่ Settings อีกครั้ง แต่ยังอาจต้องกดบัญชีตาม Google

**หากต้องการอัตโนมัติ 100% ข้ามการปิดเปิดเบราว์เซอร์และหลังโทเคนหมดอายุ** ต้องเพิ่ม backend ที่ถือเซสชันอย่างปลอดภัยหรือใช้ Apps Script hosted UI แทน static GitHub Pages + browser-only OAuth; รุ่นนี้ไม่แอบเก็บ refresh token ใน public frontend

## การใช้งานหลัก

### Student / Course

- กด **ลบนักเรียน** ใน Students หรือหน้า Profile เพื่อย้ายไปถังขยะ (Soft Delete) นักเรียนจะไม่ปรากฏในรายการปกติและไม่ถูกจับคู่กับ Excel
- เปิด **♻ ถังขยะ** เพื่อเรียกดูและกด **กู้คืนนักเรียน** ได้ โดยข้อมูลคอร์ส ชั่วโมง และประวัติยังอยู่
- หากมี Attendance ที่ยังรอ Approve ระบบจะไม่ยอมลบจนกว่าจะสะสาง; ตารางเรียนเดี่ยวที่ Active จะถูกยกเลิกและสมาชิกกลุ่มจะถูกถอดจากกลุ่มเมื่อย้ายเข้าถังขยะ
- ไม่มีฟังก์ชันลบถาวรเพื่อปกป้องหลักฐานการซื้อและหักชั่วโมงใน Ledger


- เพิ่มนักเรียน → สร้างคอร์ส → ตั้งวันเริ่มและจำนวนชั่วโมง → ระบบบันทึกยอดซื้อเข้า Hour Ledger
- **ต่อคอร์ส** → สร้าง Course Cycle ใหม่ มี Previous ID เชื่อมกลับคอร์สเก่า และซ่อนคอร์สเก่าจากหน้า Active
- เมื่อกด **ประวัติคอร์สเก่า** จะแสดงรอบเดิมพร้อม Ledger/Attendance ได้ตลอด
- หากมียอดคงเหลือเก่าระบบเลือกได้: `Transfer`, `Close`, `Keep as Held`
- **เติมชั่วโมง** กับ **ต่อคอร์ส** เป็นคนละการทำงาน
- **ปรับยอด** ต้องระบุเหตุผล และเก็บการปรับเป็น Ledger แยก ไม่เขียนทับประวัติเดิม

### Manual Class

- กรอกวันที่ เวลาเริ่ม เวลาออก และติวเตอร์
- เลือกกลุ่มหรือเลือกนักเรียนแต่ละคน
- เลือกคอร์สของแต่ละคนโดยอิสระ
- กำหนดนาทีที่จะตัดรวมกัน หรือกำหนดเฉพาะแต่ละคนในคอลัมน์ Override (MIN)
- กด **บันทึกรอตรวจสอบ** → ไป Review & History → **Approve** เพื่อหักชั่วโมงจริง

### Excel Google Meet

- รองรับโครงสร้างหัวคอลัมน์ที่แนบมา: `ชื่อ`, `นามสกุล`, `อีเมล`, `ระยะเวลา`, `เวลาที่เข้าร่วม`, `เวลาที่ออก`
- อ่านวันที่จากชื่อไฟล์ `YYYY-MM-DD` และตรวจให้แก้ไขได้
- รวบเวลาที่ชื่อ/อีเมลเดียวกันเข้า-ออกหลายครั้งโดยรวมช่วงที่ซ้อนทับกัน
- จับคู่นักเรียนจากชื่อ/อีเมล/ชื่อ alias ที่เคยบันทึก และอนุญาตให้แก้ด้วยมือ
- เลือก `Tutor`, `Student`, `Overlap`, `Specific participant`, หรือ `Custom minutes`
- เลือกนักเรียนที่จะถูกหักชั่วโมงและคอร์สที่ถูกต้องก่อนนำเข้า
- ตรวจไฟล์ซ้ำด้วย SHA-256 (ถ้าใช้ secure origin) และบันทึกใน `Imports`
- เมื่อนำเข้าแล้วเป็น **Pending** จนกด Approve; ป้องกันหักชั่วโมงโดยไม่ได้ตรวจสอบ
- **อัปโหลดหลายไฟล์พร้อมกัน** โดยกดเลือกหลายไฟล์ หรือ **ลากไฟล์หลายไฟล์มาปล่อยตรงไหนก็ได้บนหน้า Import Excel** (สูงสุด 50 ไฟล์ต่อชุด, ไฟล์ละ 10 MB) ระบบอ่านทั้งหมดในชุดเดียวและแสดง Batch Overview + ป้ายสถานะแยกแต่ละไฟล์
- สีเขียว = จับคู่รายชื่อแล้ว, สีเหลือง = ชื่อแตกต่างหรือปรากฏเพียงบางไฟล์ (อาจเป็นคนละคาบ), สีแดง = ยังจับคู่ไม่ได้ / ไฟล์ซ้ำ / อ่านไม่สำเร็จ
- ชื่อผู้ที่เป็นติวเตอร์ใน dropdown แสดงเวลาที่อ่านง่าย เช่น `13 นาที`, `1 ชม. 30 นาที` แทน `0:13`, `1:30`
- เลือกเปิดไฟล์แต่ละไฟล์เพื่อแก้รายชื่อ ติวเตอร์ วันเรียน แหล่งเวลาตัดชั่วโมง และคอร์ส ก่อนบันทึกเป็น Pending แยกตามไฟล์; ข้ามไฟล์หรือกลับมาดูได้

### Review / History

- Approve แล้วสร้างรายการ `Ledger: deduct` สำหรับนักเรียนที่เลือก
- ถ้าชั่วโมงในคอร์สไม่พอ ระบบจะหยุดอนุมัติและให้เติมหรือแก้ข้อมูลก่อน
- แก้ Attendance หลังอนุมัติ → สร้าง `Ledger: adjustment` เฉพาะส่วนต่าง
- ยกเลิกคาบที่อนุมัติแล้ว → บันทึกคืนชั่วโมง `Ledger: refund` ให้ทุกคน
- `Audit` บันทึกการกระทำ/เหตุผล (เป็นประวัติระดับแอป ไม่ใช่หลักฐานป้องกันการแก้ไขโดยเจ้าของชีตโดยตรง)

### Reports / Schedule / Backup

- ตารางเรียนแบบครั้งเดียวหรือทุกสัปดาห์ (แสดงล่วงหน้า 21 วัน)
- Dashboard แสดงยอดเหลือ สถานะ Pending และนักเรียนที่ชั่วโมงใกล้หมด
- Export CSV เปิดใน Excel ได้ และ Print ผ่าน browser เพื่อ Save as PDF
- หากต้องการสำรอง Google Sheet ไป Drive ให้รัน `backupTutorOS()` หรือ `installDailyBackup()` ใน Apps Script โดยตั้ง trigger ทุกวัน (ต้องตรวจพื้นที่จัดเก็บและ retention เอง)

## ข้อจำกัดสำคัญของเวอร์ชันนี้

- **ยังไม่ใช่ระบบ RBAC / multi-user แบบมีสิทธิ์แยกจริง:** ผู้ที่ได้ Editor access ต่อ Google Sheet สามารถแก้ชีตโดยตรงได้ จึงควรให้สิทธิ์เฉพาะเจ้าของหรือผู้ดูแลที่เชื่อถือได้ หากต้องการหลายติวเตอร์พร้อมสิทธิ์ต่างกัน ควรย้าย mutation ไป backend ที่ตรวจสิทธิ์จากเซิร์ฟเวอร์
- ระบบ Multi-file Import อ่านไฟล์ได้หลายไฟล์ในครั้งเดียว และสามารถแยกคลาสหลายรายการจากไฟล์เดียวกันได้ แต่ **ยืนยันทีละไฟล์หลังตรวจสอบ** เพื่อลดความเสี่ยงข้อมูลผิด; สถานะเปรียบเทียบชื่อข้ามไฟล์มีไว้เตือนเท่านั้น (เพราะแต่ละไฟล์อาจเป็นคนละคาบ)
- Google Sheets API มี batchUpdate แบบรวมคำสั่ง แต่กระบวนการตรวจ duplicate และยอดคงเหลือใน browser ไม่ใช่การล็อกธุรกรรมข้ามผู้ใช้ หลีกเลี่ยงการอนุมัติจากหลายบัญชีพร้อมกันจนกว่าจะเพิ่ม server-side transaction lock
- **Shared Package (กระเป๋าชั่วโมงกลางของกลุ่ม)** ยังไม่รวมใน MVP นี้: ปัจจุบันหักชั่วโมงจากคอร์สของนักเรียนแต่ละคน พร้อมเลือกจำนวนนาทีต่างกันได้
- ยังไม่มี Push Notifications, การชำระเงิน, Student/Parent Portal, Google Calendar Sync, ติวเตอร์หลายสิทธิ์, หรือรายงาน PDF ที่จัดหน้าขั้นสูง
- กลไก Import รองรับรายงานตาราง 6 คอลัมน์ตามตัวอย่างไฟล์; รูปแบบ Google Meet ที่มีข้อมูลวันเวลา/เขตเวลาแบบใหม่อาจต้องปรับ parser เพิ่ม
- **Auto-reconnect แบบปลอดภัย:** ระบบจดจำเฉพาะ OAuth Client ID และ Spreadsheet ID ใน `localStorage` และเก็บ Google access token แบบชั่วคราวใน `sessionStorage` พร้อมเวลาหมดอายุ เพื่อคืนการเชื่อมต่ออัตโนมัติเมื่อ Refresh ในแท็บเดิมภายในเวลาที่โทเคนยังใช้ได้ โดยไม่ต้องเปิด Connection Settings ซ้ำ
- **ข้อจำกัดตาม Google OAuth:** GitHub Pages เป็นเว็บ static; Google Identity Services ไม่รองรับการต่ออายุ access token แบบเบื้องหลังโดยไม่มีการกดของผู้ใช้ เมื่อหมดอายุหรือเปิดเซสชันใหม่อาจต้องกด **เชื่อมบัญชี Google** อีกครั้ง (โดยไม่ต้องกรอก Client ID / Spreadsheet ID ใหม่) และถ้า Test users ใน Google Cloud ยังไม่ได้รับสิทธิ์ ก็ต้องแก้สิทธิ์ก่อน
- ระบบไม่บันทึกรหัสผ่าน, Client Secret หรือ refresh token ไว้ใน JavaScript / `localStorage`; อย่าเปิดโปรแกรมบนคอมพิวเตอร์สาธารณะและอย่าเพิ่มสคริปต์ที่ไม่เชื่อถือได้เข้าหน้าเว็บ
- โหมด Demo เป็นตัวเลือกที่ผู้ใช้เลือกเองเท่านั้น เมื่อกำหนด Google Sheets แล้ว ระบบจะไม่แอบแสดงข้อมูลตัวอย่างแทนข้อมูลจริงแม้ยังไม่ได้ลงชื่อเข้าใช้
- ข้อมูล Demo กับ Live แยกจากกัน **ไม่ได้ย้ายข้อมูลระหว่างกันโดยอัตโนมัติ**
- ต้องต่ออินเทอร์เน็ตเพื่อใช้ Google APIs, Google OAuth และ SheetJS ผ่าน CDN
- Backup script สร้างสำเนาทุกครั้งที่รัน; โปรดตรวจสอบสิทธิ์ผู้เข้าถึงสำเนาและการเก็บรักษาข้อมูลส่วนบุคคลตาม PDPA

## แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีตรวจสอบ |
|---|---|
| `ไม่พบชีต Students` | เปิดไฟล์ Sheets เป้าหมาย แล้วรัน `setupTutorOS()` ให้ครบ 9 แท็บ |
| Google sign-in ไม่ยอมเปิด | ตรวจ Client ID, OAuth origins, Test users, HTTPS และการบล็อก pop-up |
| `The caller does not have permission` | Google Account ที่เลือกต้องมี Editor access ต่อ Spreadsheet |
| Excel import ไม่ทำงาน | เปิด DevTools และตรวจว่าโหลด `xlsx.full.min.js` สำเร็จ / หัวคอลัมน์ตรงตัวอย่าง |
| ไฟล์ถูกแจ้งว่าซ้ำ | มี fingerprint ไฟล์เดียวกันใน `Imports` แล้ว ตรวจประวัติก่อนนำเข้าใหม่ |
| Approve ไม่ผ่าน | ตรวจชั่วโมงคงเหลือของคอร์ส และดูว่าคอร์สยัง Active/Held อยู่หรือไม่ |
| ข้อมูลหายหลังปิด Browser Demo | อย่าใช้ Demo เก็บข้อมูลจริง; แนะนำต่อ Google Sheets ก่อนเริ่มงานจริง |

## ลิงก์คู่มือทางการ

- Google Sheets API: https://developers.google.com/workspace/sheets/api/guides/concepts
- Google Identity Services (OAuth token model): https://developers.google.com/identity/oauth2/web/guides/use-token-model
- GitHub Pages: https://docs.github.com/en/pages
- Apps Script spreadsheet service: https://developers.google.com/apps-script/reference/spreadsheet

---

**แนะนำ:** เริ่มทดสอบด้วยข้อมูลสมมติใน `samples/` ก่อนใช้ข้อมูลนักเรียนจริง และทำสำเนาชีตฐานข้อมูลเป็นระยะ


---

## อัปเกรด V1.3 จาก V1.1 (ไม่ลบข้อมูลเดิม)

**สำคัญ: ต้องอัปเดตสคริปต์ Google Sheets ก่อนเปลี่ยนเว็บไซต์** มิฉะนั้นแอปจะแจ้งว่าไม่พบชีตใหม่

1. สำรอง Google Sheets เดิม: `File → Make a copy` ก่อนทุกครั้ง
2. เปิด Google Sheets ฐานข้อมูลเดิม → `Extensions → Apps Script`
3. นำเนื้อหาจากไฟล์ใหม่ `apps-script/Setup.gs` ไปแทนสคริปต์ Setup ของเดิม แล้วกด **Save**
4. เลือกฟังก์ชัน `setupTutorOS` ที่แถบเลือกฟังก์ชันด้านบน แล้วกด **Run**
5. ตรวจสอบว่า **ข้อมูลเดิมทุกแท็บยังอยู่** และมีแท็บใหม่ 4 แท็บ คือ `MeetAliases`, `GroupMemberships`, `ClassRules`, `CoursePolicies` (รวม 13 แท็บ)
6. อัปโหลด/แทนที่ `index.html`, `assets/app.js`, `assets/style.css` และไฟล์อื่นตามแพ็กเกจใน repository เดิม โดย **รักษาค่าที่ตั้งไว้ใน `config.js`**; อย่าวาง OAuth Client Secret ลง GitHub
7. เปิด GitHub Pages ใหม่และรีเฟรชแบบไม่ใช้แคช (`Ctrl+Shift+R`)
8. ลองนำเข้าไฟล์ Excel **ตัวอย่าง** และตรวจหน้า Review ก่อนทดสอบกับข้อมูลจริง

**หมายเหตุ:** โค้ดชุดนี้ยังใช้ Google Sheets API จากเบราว์เซอร์โดยตรง จึงไม่สามารถรับประกันการล็อกธุรกรรมแบบหลายผู้ใช้พร้อมกันได้ และทุกบัญชีที่ได้ Editor access ต่อฐานข้อมูลก็สามารถแก้ชีตได้โดยตรง ควรใช้งานโดยผู้ดูแลที่เชื่อถือได้และไม่อนุมัติคาบเดียวกันจากหลายเครื่องพร้อมกัน

### ระบบจดจำตัวตน Google Meet

- ในหน้า `Students & Courses` → `ดูโปรไฟล์` → `＋ เพิ่มชื่อ Meet` เพื่อยืนยันชื่อ/อีเมลที่ใช้จริง
- ครั้งแรกที่นำเข้าไฟล์ Excel ให้จับคู่ชื่อ Meet กับ Student ID แล้วเลือกช่อง **จดจำชื่อ/อีเมล Meet นี้**
- เมื่อกดบันทึกเป็น Pending จะบันทึก alias ไปยัง `MeetAliases` ครั้งต่อไปจะจับคู่จากชื่อ/อีเมลที่ยืนยันไว้ได้
- หากชื่อเดียวกันหรืออีเมลเดียวกันอาจระบุได้มากกว่าหนึ่งนักเรียน ระบบจะแสดง **ตัวตนขัดแย้ง** และให้ผู้ดูแลเลือกด้วยตนเอง; ระบบจะไม่สร้างนักเรียนใหม่หรือหักชั่วโมงโดยอัตโนมัติ
- ชื่อ/อีเมล Meet ที่ไม่เคยยืนยันจะยังไม่ถูกจดจำถาวรจนกว่าผู้ดูแลยืนยัน
- กด **ยกเลิกการจดจำ** เพื่อปิด alias โดยไม่กระทบประวัติการเข้าเรียนเก่า

### ระบบกลุ่มและประวัติสมาชิก

- `Class Groups → ＋ สร้างกลุ่มเรียน` เพิ่มสมาชิกคนเดิมได้ในหลายกลุ่ม และนักเรียนยังเรียนเดี่ยวได้ตามปกติ
- `แก้ไขสมาชิก` เพื่อเปลี่ยน roster; รายการการเข้าออกกลุ่มถูกเก็บใน `GroupMemberships` ตั้งแต่เริ่มใช้เวอร์ชันนี้
- `ประวัติสมาชิก` แสดงวันที่เพิ่มและออกจากกลุ่ม
- `กติกาเริ่มต้น` กำหนดเวลาที่ใช้เป็นหลัก (ติวเตอร์/นักเรียน/เวลาซ้อนทับ) และวิธีปัดนาที
- หากกลุ่มเดิมสร้างก่อนเวอร์ชันนี้ ประวัติสมาชิก **ก่อนการอัปเกรด** จะมีข้อมูลเท่าที่ระบบเดิมเก็บไว้; ไม่สามารถกู้วันที่เข้า/ออกย้อนหลังที่ไม่เคยบันทึกได้

### Import Excel: เดี่ยว / กลุ่ม / แบ่งหลายคลาส

1. ไปที่ `Import Excel` แล้วเลือกหนึ่งไฟล์หรือหลายไฟล์
2. ตรวจสีของแต่ละรายชื่อใน `Import Conflict Center`; แดง = ยังจับคู่ไม่ได้/ขัดแย้ง, เหลือง = แตกต่างระหว่างไฟล์, เขียว = จับคู่แล้ว
3. ตรวจชื่อ Meet และเลือกนักเรียนให้ถูกต้องก่อน
4. เลือก **เรียนเดี่ยว** หรือ **เรียนกลุ่ม** แล้วเลือกกลุ่ม โดยสามารถกด **เลือกกลุ่มนี้** หากระบบเสนอจากสมาชิกหรือจากตารางเรียน
5. หากรายงานเดียวมีนักเรียนจากหลายคลาส ให้ติ๊ก **แบ่งคลาสจากรายงานเดียวกัน** แล้วเลือกประเภทคลาสแยกในแถวของนักเรียนแต่ละคน
6. เลือกคอร์สที่ถูกต้องและตรวจนาทีที่จะตัด; กด **บันทึกเป็น Pending**
7. ไป `Review & History` เพื่ออนุมัติ; เมื่ออนุมัติจึงเกิด Ledger หักชั่วโมง

ในกรณีคนเดียวใช้หลายอุปกรณ์และระบบจับคู่เป็น Student ID เดียวกัน ระบบจะรวมช่วงการเข้าร่วมที่ซ้อนกันโดยไม่บวกนาทีซ้ำ ข้อควรระวังคือกรณีที่ชื่อ/อีเมลไม่สามารถระบุตัวตนได้แน่ชัด จะต้องตรวจด้วยมือก่อน

### กติกาชั่วโมง คอร์สหมดอายุ และความสมบูรณ์ของข้อมูล

- จากโปรไฟล์นักเรียน กด **เงื่อนไขคอร์ส** เพื่อกำหนดวันหมดอายุและทางเลือกยกยอดเมื่อกดต่อคอร์ส
- คอร์สที่ระบุวันหมดอายุไว้และมีวันที่เรียนหลังวันหมดอายุ จะไม่สามารถนำเข้าเป็นรายการใหม่ได้จนกว่าจะปรับนโยบายหรือเลือกคอร์สที่ถูกต้อง
- กด **กติกาเริ่มต้น** ของกลุ่มเพื่อเลือกวิธีอ้างอิงเวลาและปัดนาที การเปลี่ยนกติกาจะไม่ย้อนกลับไปเปลี่ยน Ledger เก่า
- ในหน้า `Reports & Summary` กด **ตรวจสอบความถูกต้อง** เพื่อตรวจยอดชั่วโมงติดลบ รายงานซ้ำ Ledger ที่ผิดปกติ และชื่อ Meet ที่ขัดแย้ง
- การแก้ชั่วโมงย้อนหลัง/คืนชั่วโมงใช้กลไก Ledger และ Audit เดิมของ V1.1 โดยไม่เขียนทับประวัติเดิม

### ขอบเขตและข้อจำกัดของ v1.3

- การตรวจจับรายงานซ้ำและเวลาคาบเรียนที่ซ้อนทับกันทำงานจากข้อมูลที่โหลดในเบราว์เซอร์ ไม่ใช่การล็อกข้อมูลแบบ ACID จากเซิร์ฟเวอร์: ไม่ควรอนุมัติพร้อมกันหลายเครื่อง
- การเสนอคลาสเป็นการใช้ข้อมูลสมาชิกกลุ่มและตารางเรียนที่บันทึกไว้ ไม่ใช่การใช้ AI รับรองตัวตน
- การเลือกเรียนเดี่ยว/กลุ่ม **ไม่ตัดชั่วโมงเอง** ต้องยืนยันคาบที่ Pending ก่อนเสมอ
- ไม่ใช่ระบบที่มีสิทธิ์ RBAC แยกผู้ดูแลกับติวเตอร์หลายบัญชีจริง และยังไม่มี shared hour wallet สำหรับกลุ่ม
- ช่วงเวลาในรายงานและชื่อ Meet ยังควรตรวจโดยผู้ดูแลเมื่อมีข้อมูลแปลก/ไม่ครบ
- มี unit/smoke tests สำหรับส่วนตรรกะสำคัญใน `tests/smoke.test.cjs` แต่ไม่ได้ยืนยันการล็อกอิน Google OAuth จริงจากบัญชีของคุณหรือทำ browser end-to-end test ครบทุกหน้าจอ
- หาก OAuth 403 access_denied ให้ตรวจ **Google Cloud → Google Auth Platform → Audience → Test users** ว่ามีบัญชีที่ใช้ล็อกอิน และตรวจ **Clients → Authorized JavaScript origins** ให้ตรงกับโดเมน `https://siriphat1.github.io`


## Class Schedule — Weekly & Table Views (v1.5)

- เปิดเมนู **Class Schedule** แล้วเลือก **▦ รายสัปดาห์** เพื่อดูคาบเรียนแยกวันจันทร์–อาทิตย์ (สีเขียว = เดี่ยว, ฟ้า = กลุ่ม) หรือ **☷ ตารางรายการ** สำหรับข้อมูลแบบแถวที่เรียงตามวันและเวลา
- ใช้ปุ่ม **‹ / ›** เปลี่ยนสัปดาห์ และ **สัปดาห์นี้** กลับมาปัจจุบัน ทั้งสองมุมมองแสดงคาบในช่วงสัปดาห์เดียวกัน
- มุมมองที่เลือกจะถูกจดจำในเบราว์เซอร์นี้ โดยไม่ต้องเพิ่มชีตหรือคอลัมน์ใหม่ใน Google Sheets
- รองรับคาบที่ตั้งให้เกิดซ้ำทุกสัปดาห์ และยังใช้ปุ่มเพิ่ม/แก้ไข/ยกเลิกคาบเดิมได้ (การยกเลิกคาบแบบซ้ำจะยกเลิกทั้งชุด)
- บนมือถือมุมมองรายสัปดาห์เลื่อนซ้าย–ขวาได้ ส่วนมุมมองตารางสามารถเลื่อนแนวนอนได้เช่นกัน
- ตารางเรียนยังเป็นเพียงแผนการสอน ไม่หักชั่วโมงจนกว่าจะบันทึกและอนุมัติใน Record Hours หรือ Import Excel

### อัปเกรดจาก v1.4

อัปโหลด `index.html`, `assets/app.js` และ `assets/style.css` เวอร์ชันใหม่ขึ้น GitHub Pages โดยเก็บ `config.js` เดิมไว้ได้ **ไม่ต้องรัน Apps Script หรือปรับ Google Sheets เพิ่ม** เพราะเวอร์ชันนี้ไม่เปลี่ยนโครงสร้างฐานข้อมูล

---

## v1.6 — Bulk Attendance Review & Mandatory Save Summary (28 Oct 2026)

### Changes

- **Always show a Review Summary** before writing a manual attendance record or importing an Excel report, and before approving/deducting hours (one session or multiple sessions).
- The summary includes student, original source, class/course, attendance duration, deduction duration, and the **projected course balance**. Saving Pending does **not** deduct hours yet. The projected balance shown is what will apply **if** the Pending entry is later approved.
- **Confirmation checkbox is required**: Confirm is disabled until the user affirms that the summary has been reviewed. Back/cancel makes no changes.
- **Review & History** supports selecting all Pending sessions, selecting individual sessions, clearing the selection, and showing one combined summary for bulk approval.
- **Google Meet Import** supports choosing all, only matched, or none of the participants; applying class, time basis, custom minutes and “remember this Meet identity” to the selected participants, scoped to the current file or all uncommitted files.
- When the operator explicitly maps a Meet name to a student, identically named records with identical e-mail in the current file batch receive the same mapping automatically unless a conflicting mapping already exists. This is an operator-approved batch mapping, not an automatic match of unrelated users.
- **Save multiple files as one batch**: select files with the checkboxes in Batch Review → click “สรุปก่อนบันทึกชุดไฟล์” → review every row → tick confirmation → save all selected files together as Pending.
- Batch prevalidation checks file fingerprints, participants, active courses, group membership, overlapping attendance in existing entries **and across selected files**, and Meet alias conflicts. A failed check stops the entire batch before writing.
- All original Student Cards, Course Renewal, Class Groups and Schedule Week/Table views are retained.

### Example workflow

1. Open **Import Excel**, then drag and drop one or more `.xlsx/.xls/.csv` attendance reports.
2. Review unmatched names (red), different names across files (yellow), and matching names (green). Map unfamiliar Meet identities to the correct student once; the match is applied to corresponding records in the current batch.
3. Use **Bulk Actions** to choose current/all files and select all or only known students. Apply the correct class/group, time reference and optional minutes to selected entries.
4. In **Batch Review**, tick the files to save, and click **สรุปก่อนบันทึกชุดไฟล์**. The mandatory **Review Summary** must appear. Check the names, packages, minutes and projected balances. Tick the confirmation checkbox, then save.
5. Go to **Review & History**. Select one or more Pending sessions, click **สรุปก่อนอนุมัติ**, review the projected balances and confirm again. This is when the Hour Ledger is updated and time is actually deducted.

### Deployment upgrade from v1.5

1. **Backup** the existing Google Sheet.
2. On GitHub Pages replace `index.html`, `assets/app.js`, and `assets/style.css` from this v1.6 package. Retain the existing `config.js` (or re-enter your Client ID / Spreadsheet ID in Connection Settings).
3. No new Google Sheets columns/tabs are required for v1.6; do **not** delete or recreate the existing data sheets.
4. Clear the browser cache / hard-reload the page once to load the new JavaScript and CSS.
5. Test on demo data before approving records from live Google Sheets.

### Known limitations and safety

- GitHub Pages + browser Google Sheets API is still an **owner-operated solution**. Google OAuth permissions, expiry and account access remain under Google's controls; automatic sign-in may require fresh user consent.
- Approvals use one Google Sheets batch-update request, but the browser-side balance check is not a substitute for a server-side transaction lock if multiple administrators approve different records simultaneously. Deploy multi-user editing only after implementing server-side concurrency control.
- Each Excel attendance report is treated as an independent import source; if the same student has overlapping attendance in two reports, the batch is blocked for review instead of silently double billing.
- Summaries are mandatory for **attendance saving and approval** in v1.6. Changes to student/course master data are still performed through their existing edit forms.
- No Google account credentials, client secrets, or permanent OAuth access tokens should be committed to GitHub.
