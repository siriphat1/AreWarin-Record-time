from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
script=(root/'assets/app.js').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
 page.on('dialog',lambda d:d.accept())
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate("""() => {const map=new Map();const ls={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:ls});Object.defineProperty(window,'sessionStorage',{configurable:true,value:ls});}""")
 page.add_script_tag(content=script);page.wait_for_timeout(150)
 page.evaluate('''() => {store=new DemoStore();state.mode='demo';state.data=makeDemo();localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));state.view='leave';render();}''')
 assert page.locator('h1').first.inner_text()=='ลาหยุดและเรียนชดเชย'
 page.screenshot(path=str(root/'preview-v23-leave.png'),full_page=True)
 page.locator('[data-action="add-leave"]').click()
 page.locator('#leave-student').select_option('demo-student-a')
 page.locator('#leave-course').select_option('demo-course-a')
 page.locator('#leave-kind').select_option('pause')
 page.locator('#leave-start').fill('2026-11-02')
 page.locator('#leave-end').fill('2026-11-10')
 page.locator('#leave-return').fill('2026-11-16')
 page.locator('#leave-reason').fill('ตารางส่วนตัว')
 page.locator('#leave-form button[type=submit]').click();page.wait_for_timeout(150)
 assert page.evaluate('all("LeaveRecords").length')==1
 assert page.evaluate('balance("demo-course-a")')==480
 page.locator('[data-action="add-makeup"]').click()
 page.locator('#makeup-student').select_option('demo-student-a')
 page.locator('#makeup-course').select_option('demo-course-a')
 page.locator('#makeup-original-date').fill('2026-11-01')
 page.locator('#makeup-minutes').fill('60')
 page.locator('#makeup-note').fill('เรียนชดเชยคาบที่ตกลงกัน')
 page.locator('#makeup-form button[type=submit]').click();page.wait_for_timeout(150)
 assert page.evaluate('all("MakeupCredits").length')==1
 assert page.evaluate('all("MakeupCredits")[0].status')=='pending'
 page.locator('[data-action="plan-makeup"]').click()
 page.locator('#makeup-date').fill('2026-11-16')
 page.locator('#makeup-start').fill('10:00');page.locator('#makeup-end').fill('11:00')
 page.locator('#makeup-plan-form button[type=submit]').click();page.wait_for_timeout(150)
 assert page.evaluate('all("MakeupCredits")[0].status')=='scheduled'
 page.screenshot(path=str(root/'preview-v23-makeup.png'),full_page=True)
 # Recording scheduled make-up should create exactly one attendance and ledger debit
 page.locator('[data-action="record-makeup"]').first.click()
 assert page.locator('#class_date').input_value()=='2026-11-16'
 page.locator('#manual-form button[type=submit]').click();page.wait_for_timeout(70)
 assert page.locator('#summary-ack').count()==1
 page.locator('#summary-ack').check()
 page.locator('#summary-confirm-btn').click();page.wait_for_timeout(150)
 assert page.evaluate('all("MakeupCredits")[0].status')=='completed'
 assert page.evaluate('balance("demo-course-a")')==420
 # Calendar: planned and actual and leave must not create duplicate time-debits
 page.evaluate("state.studentId='demo-student-a';state.personalCalendarMonth='2026-11';state.view='students';render();")
 assert page.locator('.personal-calendar-grid').count()==1
 assert page.locator('.personal-cal-lesson.leave').count()>0
 page.locator('[data-action="personal-calendar-day"][data-id="2026-11-16"]').click()
 page.locator('[data-action="calendar-drawer"]').first.click()
 assert page.locator('.calendar-drawer').count()==1
 assert 'บันทึกเวลาเรียนแล้ว' in page.locator('.calendar-drawer').inner_text()
 page.locator('[data-action="close-drawer"]').last.click()
 assert page.locator('.calendar-drawer').count()==0
 page.screenshot(path=str(root/'preview-v23-calendar.png'),full_page=True)
 # Payment: add two hourly invoices and test partial then full + preservation
 page.evaluate('''() => {const t=now();const c={id:'hourly-b',student_id:'demo-student-b',title:'รายชั่วโมง ชีววิทยา',cycle_no:1,start_date:'2026-11-01',purchased_minutes:0,status:'active',previous_course_id:'',created_at:t,billing_mode:'hourly',hourly_rate_baht:450};state.data.Courses.push(c);for(let n=0;n<2;n++){const session={id:'hourly-session-'+n,date:'2026-11-17',start_time:n?'19:30':'18:00',end_time:n?'20:30':'19:30',mode:'manual',group_id:'',tutor:'Tutor',status:'approved',created_at:t};const att={id:'hourly-att-'+n,session_id:session.id,student_id:'demo-student-b',course_id:c.id,join_time:session.start_time,leave_time:session.end_time,actual_minutes:n?60:90,deduct_minutes:n?60:90,status:'approved',created_at:t};state.data.Sessions.push(session);state.data.Attendance.push(att);state.data.Billing.push(hourlyInvoice(att,c));}localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));state.view='billing';render();}''')
 assert page.locator('[data-pay-select]').count()==2
 page.screenshot(path=str(root/'preview-v23-billing.png'),full_page=True)
 page.locator('[data-pay-select]').first.check();page.locator('[data-pay-select]').last.check()
 page.locator('[data-action="pay-selected"]').click()
 page.locator('#pay-amount').fill('400');page.locator('[name="confirm-paid"]').check()
 page.locator('#partial-payment-form button[type=submit]').click();page.wait_for_timeout(150)
 assert page.evaluate('all("Payments").reduce((n,x)=>n+Number(x.amount_satang),0)')==40000
 assert page.evaluate('outstandingBills().length')==2
 page.locator('[data-pay-select]').first.check();page.locator('[data-pay-select]').last.check()
 page.locator('[data-action="pay-selected"]').click()
 page.locator('[name="confirm-paid"]').check()
 page.locator('#partial-payment-form button[type=submit]').click();page.wait_for_timeout(150)
 assert page.evaluate('outstandingBills().filter(b=>b.student_id==="demo-student-b").length')==0
 assert page.evaluate('all("Payments").length')==3
 # Export
 with page.expect_download() as down:
  page.evaluate('exportICS("demo-student-a")')
 assert down.value.suggested_filename.endswith('.ics')
 with page.expect_download() as down:
  page.evaluate("window.confirm=()=>true;backupExport()")
 assert down.value.suggested_filename.endswith('.json')
 # Lesson journal
 page.evaluate('state.view="journal";render();')
 page.locator('[data-action="lesson-note"]').first.click()
 page.locator('#lesson-title').fill('Cell Biology')
 page.locator('#lesson-homework').fill('Review chapter 3')
 page.locator('#lesson-form button[type=submit]').click();page.wait_for_timeout(110)
 assert page.evaluate('all("LessonNotes").length')==1
 # Check mobile no overflow on primary pages
 page.set_viewport_size({'width':390,'height':844})
 for view in ['dashboard','leave','journal','billing','notifications','system']:
  page.evaluate('(v)=>{state.view=v;render();}',view)
  assert page.locator('body').evaluate('(el)=>el.scrollWidth <= window.innerWidth + 2'),view
 page.screenshot(path=str(root/'preview-v23-mobile.png'),full_page=True)
 assert not errors,errors
 print('PASS v2.3 browser: leave/pause, make-up ledger, calendar, two-stage payments, ICS, backup, journal, mobile')
 b.close()

