from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
src=(root/'assets/app.js').read_text()
with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
  for width,height,label in [(1440,900,'desktop'),(390,844,'mobile')]:
    page=browser.new_page(viewport={'width':width,'height':height})
    page.set_default_timeout(8000)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.set_content(html,wait_until='domcontentloaded')
    page.evaluate('''() => {const memory=new Map();const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}''')
    page.add_script_tag(content=src)
    page.evaluate('''() => {store=new DemoStore();state.data=makeDemo();state.mode='demo';
     const student={id:'batch-student',name:'น้องทดสอบหลายคาบ',email:'',aliases:'',status:'active',created_at:now(),school:'โรงเรียนตัวอย่าง',grade_level:'ม.5'};
     const course={id:'batch-course',student_id:student.id,title:'Biology Course',cycle_no:1,start_date:'2026-11-01',purchased_minutes:600,status:'active',created_at:now(),billing_mode:'package'};
     state.data.Students.push(student);state.data.Courses.push(course);
     state.data.Ledger.push({id:uuid(),student_id:student.id,course_id:course.id,session_id:'',type:'purchase',minutes:600,note:'test balance',created_at:now()});
     localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));go('manual');
    }''')
    page.locator('#manual-picker').select_option('s:batch-student')
    page.locator('#class_date').fill('2026-11-10')
    page.locator('#class_start').fill('16:00')
    page.locator('#manual-session-list .manual-session-row').first.locator('[data-minutes="90"]').click()
    assert page.locator('#class_end').input_value()=='17:30'
    assert page.locator('#manual-auto-duration').inner_text()=='1 ชม. 30 นาที'
    page.locator('[data-action="manual-add-session"]').click()
    assert page.locator('.manual-session-row').count()==2
    extra=page.locator('.manual-session-row').last
    extra.locator('[data-manual-date]').fill('2026-11-11')
    extra.locator('[data-manual-start]').fill('18:00')
    extra.locator('[data-minutes="60"]').click()
    assert extra.locator('[data-manual-end]').input_value()=='19:00'
    assert extra.locator('[data-manual-duration]').inner_text()=='1 ชม.'
    page.screenshot(path=str(root/f'preview-v243-manual-batch-{label}.png'),full_page=True)
    page.locator('#manual-form button[type="submit"]').click()
    assert page.locator('#summary-ack').count()==1
    summary=page.locator('#overlay').inner_text()
    assert '2026-11-10' in summary and '2026-11-11' in summary
    page.locator('#summary-ack').check();page.locator('#summary-confirm-btn').click()
    page.wait_for_timeout(260)
    assert page.evaluate("all('Sessions').filter(s=>['2026-11-10','2026-11-11'].includes(s.date)&&s.mode==='manual').length")==2
    assert page.evaluate("all('Attendance').filter(a=>a.student_id==='batch-student').length")==2
    assert page.evaluate("balance('batch-course')")==450
    assert page.evaluate("all('Ledger').filter(l=>l.course_id==='batch-course'&&l.type==='deduct').length")==2
    assert not errors,errors
    page.screenshot(path=str(root/f'preview-v243-manual-batch-after-{label}.png'),full_page=False)
    # Check overlap warning without opening confirmation
    page.evaluate("go('manual')")
    page.locator('#manual-picker').select_option('s:batch-student')
    page.locator('#class_date').fill('2026-12-01')
    page.locator('#class_start').fill('16:00')
    page.locator('#class_end').fill('17:30')
    page.locator('[data-action="manual-add-session"]').click()
    extra=page.locator('.manual-session-row').last
    extra.locator('[data-manual-date]').fill('2026-12-01')
    extra.locator('[data-manual-start]').fill('17:00')
    extra.locator('[data-manual-end]').fill('18:00')
    page.locator('#manual-form button[type="submit"]').click()
    page.wait_for_timeout(150)
    assert page.locator('#summary-ack').count()==0
    assert page.evaluate("all('Sessions').filter(s=>s.date==='2026-12-01').length")==0
    # Hourly tuition: multi-session must create separate unpaid invoices, no package ledger.
    page.evaluate('''() => {state.data.Students.push({id:'hourly-batch-student',name:'ทดสอบรายชั่วโมง',status:'active',created_at:now()});
      state.data.Courses.push({id:'hourly-batch-course',student_id:'hourly-batch-student',title:'รายชั่วโมง',cycle_no:1,status:'active',billing_mode:'hourly',hourly_rate_baht:400,created_at:now()});
      localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));go('manual');}''')
    page.locator('#manual-picker').select_option('s:hourly-batch-student')
    page.locator('#class_date').fill('2026-12-10')
    page.locator('#class_start').fill('16:00')
    page.locator('[data-manual-session-row]').first.locator('[data-minutes="90"]').click()
    page.locator('[data-action="manual-add-session"]').click()
    extra=page.locator('.manual-session-row').last
    extra.locator('[data-manual-date]').fill('2026-12-11')
    extra.locator('[data-minutes="60"]').click()
    page.locator('#manual-form button[type="submit"]').click()
    page.locator('#summary-ack').check();page.locator('#summary-confirm-btn').click()
    page.wait_for_timeout(150)
    assert page.evaluate("all('Billing').filter(b=>b.student_id==='hourly-batch-student').length")==2
    assert page.evaluate("all('Billing').filter(b=>b.student_id==='hourly-batch-student').reduce((n,b)=>n+Number(b.amount_satang),0)")==100000
    assert page.evaluate("all('Ledger').filter(l=>l.student_id==='hourly-batch-student'&&l.type==='deduct').length")==0
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{label}: horizontal overflow'
    print('PASS batch UI',label,'quick duration, two sessions/one commit, no double deduct, overlap blocked, hourly invoice')
    page.close()
  browser.close()
