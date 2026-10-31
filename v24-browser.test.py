from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
script=(root/'assets/app.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for width,height,device in [(1440,900,'desktop'),(390,844,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:d.accept())
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate("""() => {const map=new Map();const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}""")
  page.add_script_tag(content=script)
  page.evaluate('''() => {store=new DemoStore();state.mode='demo';state.data=makeDemo();localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));state.data.Schedules.push({id:'v24-schedule',date:'2026-10-01',student_id:'demo-student-a',group_id:'',start_time:'17:00',end_time:'18:00',tutor:'Tutor',repeat_rule:'weekly',status:'active'});state.reconcileMonth='2026-10';state.financeMonth='2026-10';render();}''')
  for view in ['reconcile','timeline','finance','system','import']:
   page.evaluate('(v)=>{state.view=v;render()}',view)
   assert not errors,(view,errors)
   assert page.locator('main#app').inner_text().strip(),view
   if device=='desktop':page.screenshot(path=str(root/f'preview-v24-{view}.png'),full_page=True)
   elif view in ['reconcile','timeline','finance']:page.screenshot(path=str(root/f'preview-v24-{view}-mobile.png'),full_page=True)
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'),(device,view,'horizontal overflow')
  # New routing from grouped sidebar
  assert page.locator('#nav [data-view="reconcile"]').count()==1
  assert page.locator('#nav [data-view="finance"]').count()==1
  assert page.locator('#nav [data-view="timeline"]').count()==1
  # Test receipt rendering and finance after real payment data in demo state
  page.evaluate('''() => {const t=now();const c={id:'v24-course',student_id:'demo-student-a',title:'เรียนรายชั่วโมง',cycle_no:1,start_date:'2026-10-01',status:'active',billing_mode:'hourly',hourly_rate_baht:500};const sess={id:'v24-session',date:'2026-10-11',start_time:'18:00',end_time:'19:30',status:'approved'};const a={id:'v24-att',student_id:'demo-student-a',course_id:'v24-course',session_id:'v24-session',actual_minutes:90,deduct_minutes:90,status:'approved'};state.data.Courses.push(c);state.data.Sessions.push(sess);state.data.Attendance.push(a);const b=hourlyInvoice(a,c);b.status='partial';state.data.Billing.push(b);state.data.Payments.push({id:'v24-payment',billing_id:b.id,amount_satang:25000,method:'transfer',paid_on:'2026-10-11',note:'partial',created_at:t});state.view='finance';render();}''')
  if device=='desktop':page.screenshot(path=str(root/'preview-v24-finance-with-payments.png'),full_page=True)
  assert page.locator('[data-action="receipt-payment"]').count()==1
  assert '250.00' in page.locator('main').inner_text()
  with page.expect_download() as info:page.locator('[data-action="finance-csv"]').click()
  assert info.value.suggested_filename.endswith('.csv')
  page.evaluate("state.view='timeline';state.timelineStudent='demo-student-a';render()")
  assert 'รับชำระค่าคาบ' in page.locator('main').inner_text()
  # test direct PDF receipt if html2canvas is available; otherwise print fallback not deterministic
  # Import mock: verify original raw + user time override and Final Review
  page.evaluate('''() => {const d={filename:'report-2026-10-12.xlsx',fingerprint:'mockfingerprint',date:'2026-10-12',dateSource:'filename',dateConflict:false,people:[{name:'Tutor',join:'18:00',leave:'20:00',segments:[[1080,1200]],actual:120,include:false,studentId:''},{name:'Student A',join:'18:00',leave:'19:30',segments:[[1080,1170]],actual:90,include:true,studentId:'demo-student-a',courseId:'demo-course-a',remember:false,manualMinutes:null,matchLevel:'match',matchReason:'manual',variants:[{name:'Student A',email:''}]}],tutorIndex:0,sourceIndex:0,basis:'tutor',classType:'private',groupId:'',split:false};state.importDrafts=[d];state.importQueue=[{name:d.filename}];state.importDone=[''];state.importIndex=0;state.importDraft=d;state.importTimeEditing=null;state.view='import';render();}''')
  page.locator('[data-action="edit-import-time"]').click()
  page.locator('#import-time-start-0').fill('18:30')
  page.locator('#import-time-end-0').fill('19:30')
  page.locator('[data-action="save-import-time"]').click()
  assert page.evaluate('state.importDraft.timeOverrideStart')=='18:30'
  assert page.evaluate('state.importDraft.people[1].actual')==90
  assert page.evaluate('reportClock(state.importDraft).minutes')==60
  assert page.locator('.import-date-cell').count()>=1
  assert not errors,errors
  print('PASS v2.4 browser',device,'navigation/finance/timeline/reconciliation/import date+time/CSV/no overflow')
  page.close()
 browser.close()
