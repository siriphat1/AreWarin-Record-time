# AreWarin Tutor OS — GitHub Pages + Private Google Sheets

**Version:** 1.0 MVP · **UI:** Thai / English · **Timezone:** Asia/Bangkok · **Style:** Academic Minimal / Forest Green

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
│   └── รายงานการเข้าร่วม demo-meet ... .xlsx
├── README.md
└── TESTING.md
```

**ไม่มีการแนบข้อมูลนักเรียนจริงจากไฟล์ตัวอย่างที่คุณอัปโหลด** ไฟล์ใน `samples/` เป็นข้อมูลสมมติทั้งหมด

## วิธีเปิดทดลอง (Demo Mode)

1. เปิด `index.html` ใน Chrome/Edge หรืออัปโหลดขึ้น GitHub Pages ได้ทันที
2. หน้า Dashboard มีข้อมูลจำลองของนักเรียน A/B เพื่อทดลองฟีเจอร์
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
- ระบบจะสร้างชีต 9 แท็บ ได้แก่ `Students`, `Courses`, `Groups`, `Schedules`, `Sessions`, `Attendance`, `Ledger`, `Imports`, `Audit`
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
5. กด `Connection settings → Connect Google Sheets` แล้วเลือก Google Account ที่มี **Editor access** ต่อชีตฐานข้อมูล
6. เปิด Dashboard และทดสอบเพิ่มนักเรียน 1 คนก่อนใช้ข้อมูลจริง

เมื่อ Sign in Google จะออก access token ระยะสั้นให้เบราว์เซอร์และ API จะใช้สิทธิ์ Google Sheets ของบัญชีที่เลือก โดยไม่ต้องเปิดชีตสาธารณะ

## การใช้งานหลัก

### Student / Course

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
- อัปโหลดหลายไฟล์ได้ โดยระบบเปิดตรวจทีละไฟล์

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
- Google Sheets API มี batchUpdate แบบรวมคำสั่ง แต่กระบวนการตรวจ duplicate และยอดคงเหลือใน browser ไม่ใช่การล็อกธุรกรรมข้ามผู้ใช้ หลีกเลี่ยงการอนุมัติจากหลายบัญชีพร้อมกันจนกว่าจะเพิ่ม server-side transaction lock
- **Shared Package (กระเป๋าชั่วโมงกลางของกลุ่ม)** ยังไม่รวมใน MVP นี้: ปัจจุบันหักชั่วโมงจากคอร์สของนักเรียนแต่ละคน พร้อมเลือกจำนวนนาทีต่างกันได้
- ยังไม่มี Push Notifications, การชำระเงิน, Student/Parent Portal, Google Calendar Sync, ติวเตอร์หลายสิทธิ์, หรือรายงาน PDF ที่จัดหน้าขั้นสูง
- กลไก Import รองรับรายงานตาราง 6 คอลัมน์ตามตัวอย่างไฟล์; รูปแบบ Google Meet ที่มีข้อมูลวันเวลา/เขตเวลาแบบใหม่อาจต้องปรับ parser เพิ่ม
- ขณะใช้งาน Live ต้องเชื่อม Google Sign-In ใหม่เมื่อ session/access token หมดอายุ; ข้อมูล Live ไม่ถูกเก็บค้างใน localStorage
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
