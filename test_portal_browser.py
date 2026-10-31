from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil
root=Path(__file__).resolve().parents[1]
html=root/'student-portal/apps-script/Student.html'
preview=root/'student-preview.html'
shutil.copyfile(html,preview)
mock=r'''(() => {
const data={student:{name:'น้องมิลิน',fullName:'มิลิน',school:'โรงเรียนตัวอย่าง',grade:'ม.5',code:'26-0001',status:'active'},courses:[{id:'c1',title:'Biology Olympiad',cycle:1,status:'active',mode:'package',rate:0,purchased:1200,used:420,balance:780},{id:'c2',title:'Biochemistry',cycle:1,status:'active',mode:'hourly',rate:450,purchased:0,used:120,balance:0}],attendance:[{id:'a1',courseId:'c1',course:'Biology Olympiad',date:'2026-10-26',start:'16:33',end:'17:08',minutes:35},{id:'a2',courseId:'c2',course:'Biochemistry',date:'2026-10-20',start:'18:00',end:'19:30',minutes:90}],schedule:[{id:'s1',date:'2026-10-26',start:'16:00',end:'18:00',repeat:'weekly',kind:'private',tutor:'Suthawarin'},{id:'s2',date:'2026-10-28',start:'19:00',end:'20:00',repeat:'weekly',kind:'group',tutor:'Suthawarin'}],billing:[{id:'b1',courseId:'c2',course:'Biochemistry',minutes:120,amount:90000,paid:0,date:'2026-10-26'}],leave:[],makeup:[{id:'m1',courseId:'c1',originDate:'2026-10-24',scheduledDate:'2026-11-03',start:'18:00',end:'20:00',minutes:120,status:'scheduled'}],requests:[{id:'r1',kind:'makeup',status:'pending',courseId:'c1',date:'2026-10-24',targetDate:'2026-11-03',amount:0,createdAt:'2026-10-25T18:00',adminNote:''}],lessonNotes:[{title:'Cell Division',homework:'ทบทวน Mitosis และ Meiosis',createdAt:'2026-10-26',courseId:'c1'}],bank:{recipientName:'กวดวิชาชีววิทยา อาวริน',promptpayId:'1901001151577',bank:'กรุงไทย',bankAccount:'664-343-6974'}};
window.google={script:{run:{withSuccessHandler(fn){return {withFailureHandler(err){return new Proxy({}, {get(_,method){return (...args)=>{Promise.resolve().then(()=>fn(method==='loginStudent'?{token:'mocktoken',expiresAt:'2026-11-01'}:method==='getMyData'?data:method==='submitPortalRequest'?{id:'p1',status:'pending'}:true));};}});}};}}}};
sessionStorage.setItem('aw_student_token','mocktoken');window.__mockData=data;
})();'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for device,w,h in [('desktop',1440,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.route('https://*',lambda route:route.abort())
  test_html=preview.read_text().replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>', '<script>'+mock+'</script>')
  page.set_content(test_html,wait_until='domcontentloaded')
  page.get_by_text('My Learning',exact=True).wait_for(timeout=12000)
  assert page.get_by_text('น้องมิลิน').count() > 0
  assert page.get_by_text('13 ชม.').count()>0
  assert page.get_by_text('แก้ไขเวลา').count()==0
  page.screenshot(path=str(root/f'preview-student-portal-{device}.png'),full_page=True)
  page.locator('[data-nav="history"]').first.click()
  assert page.get_by_text('35 นาที').count()>0
  assert page.get_by_text('แก้ไขเมื่อ').count()==0
  assert page.get_by_text('Hour Ledger').count()==0
  page.locator('[data-nav="payments"]').first.click()
  page.locator('[data-pay="b1"]').first.click()
  assert page.get_by_text('กวดวิชาชีววิทยา อาวริน').count()>0
  assert page.get_by_text('900.00').count()>0
  page.locator('#popclose').click()
  page.locator('[data-nav="requests"]').first.click() if device=='desktop' else page.evaluate("app.view='requests';render()")
  assert page.get_by_text('ขอเรียนชดเชย').count()>0
  overflow=page.evaluate('document.documentElement.scrollWidth>window.innerWidth+3')
  assert not overflow, f'overflow on {device}'
  page.close()
 browser.close()
print('Student Portal: desktop & mobile UI, payments, history privacy, requests PASS')
