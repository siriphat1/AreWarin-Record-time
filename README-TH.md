# AreWarin Tutor OS v2.5.2 — Startup Hotfix

## แก้ไข
- `Uncaught ReferenceError: portalManagerView is not defined` — รวม Portal Manager ใน `assets/app.js` แล้ว ไม่ต้องแยกไฟล์ `portal-manager.js`
- `Cannot access scheduleException before initialization` — เลื่อนการเริ่มแอปไปหลังประกาศฟังก์ชันและตัวแปรทั้งหมด และใช้ฟังก์ชันที่ hoist ได้
- เปลี่ยน cache version เป็น `v=2.5.2` เพื่อไม่ให้โหลด app.js เก่าค้างจาก GitHub Pages

## ติดตั้ง (GitHub Pages repo `AreWarin-Record-time`)
1. สำรอง `index.html`, `assets/app.js` และ `assets/style.css` เดิมก่อน
2. นำ `index.html` ใหม่วางที่ราก Repository (ทับ `index.html` เดิมของ Tutor OS เท่านั้น **ไม่ใช่** `/student/index.html`)
3. นำ `assets/app.js` และ `assets/style.css` ไปแทนในโฟลเดอร์ `assets/`
4. **ไม่ต้อง** ลบ `config.js` หรืออัปโหลดแก้โฟลเดอร์ `student/` และ **ไม่ต้อง** แก้ `Code.gs`, Apps Script, Google Sheets, Cloudflare Worker
5. ถ้า Repository มี `assets/portal-manager.js` เดิม สามารถเก็บไว้ได้ แต่หน้า `index.html` ใหม่นี้จะไม่โหลดแยก เพื่อป้องกันเหตุการณ์ซ้ำ
6. Commit Changes แล้วเปิด `https://siriphat1.github.io/AreWarin-Record-time/` และกด Ctrl+Shift+R
7. ทดสอบหน้า นักเรียนและคอร์ส, กลุ่มเรียน, Student Portal Manager และการเชื่อม Google Sheets

## ความมั่นใจในการทดสอบ
- ตรวจ JavaScript syntax ด้วย `node --check` และทดสอบโหลดผ่าน browser local ที่ไม่มี Google credentials (หน้า gate / demo)
- ไม่มีการแก้ข้อมูลใน Google Sheets หรือเชื่อมบัญชีจริง
- ถ้ายังเห็น `app.js?v=2.5.1` ใน DevTools Network แสดงว่า `index.html` ใหม่ยังไม่เผยแพร่หรือ cache ไม่อัปเดต

**หมายเหตุ**: ข้อความ `Cross-Origin-Opener-Policy policy would block the window.closed call` อาจเป็นคำเตือนจาก Google Sign-In popup แยกจากข้อผิดพลาด JavaScript สองรายการข้างต้น
