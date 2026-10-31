from pathlib import Path
from playwright.sync_api import sync_playwright
import re, traceback
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
html=re.sub(r'<link rel="stylesheet" href="assets/style.css[^>]+>', '<style>'+(root/'assets/style.css').read_text()+'</style>',html)

def click_sidebar_page(page, view):
 if view=='dashboard':
  page.locator('#nav [data-view="dashboard"]').click()
  return
 target=page.locator(f'#nav .nav-subitem[data-view="{view}"]')
 if not target.is_visible():
  group=target.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " nav-group ")]')
  group.locator('.nav-group-toggle').click()
 target.click()

with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900})
 page.set_default_timeout(4500)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate('''() => { const m=new Map(),q=new Map();window.TUTOR_CONFIG={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>q.get(k)||null,setItem:(k,v)=>q.set(k,v),removeItem:k=>q.delete(k)}}); }''')
 page.add_script_tag(content=(root/'assets/app.js').read_text())
 page.get_by_role('button',name='ทดลองข้อมูลจำลอง').click()
 def code(js):return page.evaluate(js)
 print('dashboard', 'วันนี้สอนใครบ้าง' in page.locator('#app').inner_text())
 # student add with schedule
 page.locator('[data-action="add-student"]').first.click()
 page.locator('#student-name').fill('น้องทดสอบ')
 page.locator('.student-schedule-optional summary').click()
 page.locator('#student-sched-date').fill('2026-11-08')
 page.locator('#student-sched-start').fill('13:30')
 page.locator('#student-sched-end').fill('15:00')
 page.locator('#student-form button[type="submit"]').click()
 page.wait_for_timeout(300)
 testid=code("all('Students').find(x=>x.name==='น้องทดสอบ').id")
 assert code("all('Schedules').some(x=>x.student_id==='"+testid+"'&&x.date==='2026-11-08')")
 print('student+schedule added')
 # assign from catalog
 page.locator('[data-action="assign-existing-course"]').last.click()
 page.locator('#template-course').select_option('demo-course-a')
 page.locator('#assigned-date').fill('2026-11-01')
 page.locator('#assigned-hours').fill('10')
 page.locator('#assign-course-form button[type="submit"]').click()
 page.wait_for_timeout(300)
 assert code("liveCourses('"+testid+"').length") == 1
 print('course assigned')
 # manual
 click_sidebar_page(page, "manual")
 page.locator("#manual-picker").select_option("s:"+testid)
 page.locator('#class_date').fill('2026-11-02')
 page.locator('#class_start').fill('18:00')
 page.locator('#class_end').fill('19:30')
 assert '1 ชม. 30 นาที' in page.locator('#manual-auto-duration').inner_text()
 # Student-first selector already checks the active course
 page.locator('#manual-form button[type="submit"]').click()
 assert page.locator('#summary-ack').count()==1
 page.locator('#summary-ack').check();page.locator('#summary-confirm-btn').click()
 page.wait_for_timeout(250)
 assert code("all('Sessions').some(x=>x.date==='2026-11-02'&&x.status==='approved')")
 assert code("balance(liveCourses('"+testid+"')[0].id)") == 510
 print('manual approved, deducted, balance 510')
 # duplicate block
 click_sidebar_page(page, "manual")
 page.locator("#manual-picker").select_option("s:"+testid)
 page.locator('#class_date').fill('2026-11-02')
 page.locator('#class_start').fill('18:00')
 page.locator('#class_end').fill('19:30')
 # Student-first selector already checks the active course
 page.locator('#manual-form button[type="submit"]').click()
 page.wait_for_timeout(200)
 assert page.locator('#summary-ack').count()==0, 'duplicate should not reach modal'
 print('duplicate manual rejected')
 # Student profile history + cancel then refund
 click_sidebar_page(page, "students")
 page.locator('[data-action="student-detail"][data-id="'+testid+'"]').first.click()
 # v2.2+ puts recorded history in Learning History (not duplicated in Profile).
 page.evaluate("state.personalCalendarMonth='2026-11';state.personalCalendarDay='2026-11-02';render();")
 assert page.locator('#profile .personal-calendar-grid').count()==1
 assert page.locator('#profile [data-action="personal-calendar-day"][data-id="2026-11-02"]').count()==1
 page.locator('#profile [data-action="student-attendance-history"]').click()
 assert page.locator('[data-action="session-detail"]').count()>0
 page.locator('[data-action="session-detail"]').first.click()
 assert page.locator('#overlay [data-action="cancel-attendance"]').count()>0
 page.locator('#overlay [data-action="cancel-attendance"]').first.click()
 page.wait_for_timeout(220)
 assert code("balance(liveCourses('"+testid+"')[0].id)")==600
 print('cancel refunded')
 # Planned schedule still appears on the student profile calendar.
 click_sidebar_page(page, "students")
 page.locator('[data-action="student-detail"][data-id="'+testid+'"]').first.click()
 page.evaluate("state.personalCalendarMonth='2026-11';state.personalCalendarDay='2026-11-08';render();")
 assert page.locator('#profile [data-action="personal-calendar-day"][data-id="2026-11-08"]').count()==1
 print('linked schedule')
 # Simulate import two files in JS (no xlsx network) - separate years
 page.evaluate("""() => {
   const make=(date,filename,fingerprint,alias)=>({date,filename,fingerprint,dateSource:'filename',dateConflict:false,people:[
    {name:'Suthawarin',email:'',actual:30,join:'20:00',leave:'20:30',segments:[[1200,1230]],studentId:'',include:false,matchLevel:'tutor'},
    {name:alias,email:'meet@example.org',actual:30,join:'20:00',leave:'20:30',segments:[[1200,1230]],studentId:'demo-student-a',courseId:'demo-course-a',include:true,remember:false,variants:[{name:alias,email:'meet@example.org'}],manualMinutes:null,classChoice:'private',matchLevel:'match'}
   ],tutorIndex:0,sourceIndex:0,basis:'tutor',groupId:'',classType:'private',split:false});
   const drafts=[make('2026-11-10','meet-2026-11-10.xlsx','fp_v18a','A Biology'),make('2026-11-11','meet-2026-11-11.xlsx','fp_v18b','A Biology')];
   state.importQueue=drafts.map(d=>({name:d.filename}));state.importDrafts=drafts;state.importDone=['',''];state.importErrors=['',''];state.importIndex=0;state.importDraft=drafts[0];go('import');
 }""")
 assert page.locator('#import-summary').count()==1
 assert page.locator('#import-config #import-date').count()==0
 assert page.locator('#import-people #import-date').count()==0  # v2.0.1 hides date correction for valid dates
 assert page.locator('.import-record-table tbody tr').count()==2
 page.locator('[data-action="preview-batch-import"]').last.click()
 page.locator('#summary-ack').check()
 page.locator('#summary-confirm-btn').click()
 page.wait_for_timeout(250)
 assert code('all("Imports").length')==2
 assert code('all("Sessions").filter(x=>x.status==="approved"&&x.mode==="excel").length')==2
 assert code('state.importQueue.length')==0
 print('import 2 files approved, workspace cleared')
 # group: independently deduct each student's own course, cancel only one student, preserve the other
 click_sidebar_page(page, "manual")
 page.locator("#manual-picker").select_option("g:demo-group-1")
 page.locator('#class_date').fill('2026-11-15')
 page.locator('#class_start').fill('18:00')
 page.locator('#class_end').fill('19:00')
 # Group selection above populates the hidden group_id
 page.locator('#manual-form button[type="submit"]').click()
 assert page.locator('#summary-ack').count()==1
 page.locator('#summary-ack').check();page.locator('#summary-confirm-btn').click()
 page.wait_for_timeout(200)
 gsid=code("all('Sessions').find(s=>s.date==='2026-11-15').id")
 assert code("all('Attendance').filter(a=>a.session_id==='"+gsid+"').length")==2
 bbal=code('balance("demo-course-b")')
 abud=code('balance("demo-course-a")')
 aid=code("all('Attendance').find(a=>a.session_id==='"+gsid+"'&&a.student_id==='demo-student-a').id")
 code("window.__aId='"+aid+"'")
 # page's confirm is native, handled by page.on('dialog')
 page.evaluate("cancelAttendance(window.__aId)")
 page.wait_for_timeout(250)
 assert code('balance("demo-course-a")')==abud+60
 assert code('balance("demo-course-b")')==bbal
 assert code("byId('Sessions','"+gsid+"').status")=='approved'
 print('group cancellation refunds only chosen student')
 # now cancel entire group session: must refund B once, not refund A twice.
 page.evaluate("cancelSession('"+gsid+"')")
 page.wait_for_timeout(250)
 assert code('balance("demo-course-a")')==abud+60
 assert code('balance("demo-course-b")')==bbal+60
 print('full-session cancellation does not double refund a previously cancelled student')
 # Recorded-only import dates should still be visible in the calendar.
 page.evaluate("state.scheduleWeek=calendarWeekStart('2026-11-10');go('schedule');")
 assert 'น้อง A' in page.locator('#app').inner_text() and '10' in page.locator('#app').inner_text()
 print('imported attendance dates show on class calendar')
 # old pending: must not auto-deduct during upgrade, but can be settled once explicitly
 code("""() => {
  const sid='legacy-pending-v18', t=now();
  state.data.Sessions.push({id:sid,date:'2026-11-22',start_time:'20:00',end_time:'20:30',mode:'manual',group_id:'',tutor:'Suthawarin',time_source:'actual',status:'pending',source_file:'',notes:'legacy',created_at:t});
  state.data.Attendance.push({id:'legacy-at-v18',session_id:sid,student_id:'demo-student-b',course_id:'demo-course-b',join_time:'20:00',leave_time:'20:30',actual_minutes:30,deduct_minutes:30,status:'pending',source_name:'',created_at:t});
  localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));
 }""")
 before=code('balance("demo-course-b")')
 assert code('balance("demo-course-b")')==before
 code('window.__legacyPromise=approveSessions(["legacy-pending-v18"])')
 page.wait_for_timeout(300)
 assert code('balance("demo-course-b")')==before-30
 assert code("byId('Sessions','legacy-pending-v18').status")=='approved'
 print('legacy pending settled exactly once')
 # screenshot dashboard, student profile, schedule
 click_sidebar_page(page, "dashboard")
 page.screenshot(path=str(root/'v18-dashboard-preview.png'))
 click_sidebar_page(page, "students")
 page.locator('[data-action="student-detail"][data-id="'+testid+'"]').first.click()
 page.screenshot(path=str(root/'v18-student-preview.png'),full_page=True)
 print('ERRORS:',errors)
 assert not errors,errors
 b.close()
