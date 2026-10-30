from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
html=re.sub(r'<link rel="stylesheet" href="assets/style.css[^>]+>', '<style>'+(root/'assets/style.css').read_text()+'</style>',html)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1400,'height':960})
 page.on('dialog',lambda d:d.accept())
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate('''() => {const l=new Map(),s=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>l.get(k)||null,setItem:(k,v)=>l.set(k,v),removeItem:k=>l.delete(k)}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>s.get(k)||null,setItem:(k,v)=>s.set(k,v),removeItem:k=>s.delete(k)}});}''')
 page.add_script_tag(content=(root/'assets/app.js').read_text())
 page.get_by_role('button',name='ทดลองข้อมูลจำลอง').click()
 # Prepare 3 dates and two files with valid dates, plus one missing date.
 page.evaluate('''() => {
  const id='demo-student-a',course='demo-course-a';
  const add=(date,start,end,minutes,sid)=>{
   state.data.Sessions.push({id:sid,date,start_time:start,end_time:end,mode:'excel',group_id:'',tutor:'Suthawarin',time_source:'tutor',status:'approved',source_file:'Meet '+date+'.xlsx',notes:'test',created_at:now()});
   state.data.Attendance.push({id:'attendance-'+sid,session_id:sid,student_id:id,course_id:course,join_time:start,leave_time:end,actual_minutes:minutes,deduct_minutes:minutes,status:'approved',source_name:'iPad A',created_at:now()});
  };
  add('2026-06-29','19:00','20:00',60,'multi-1');
  add('2026-07-06','19:00','19:45',45,'multi-2');
  add('2026-10-26','18:59','20:50',111,'multi-3');
  const d=(date,filename)=>({date,filename,fingerprint:filename,dateSource:'filename',dateConflict:false,people:[{name:'Suthawarin',email:'tutor@example.com',segments:[[1140,1200]],actual:60,join:'19:00',leave:'20:00',studentId:'',courseId:'',include:false,remember:false,classChoice:'private',manualMinutes:null,variants:[]} ,{name:'iPad A',email:'',segments:[[1140,1200]],actual:60,join:'19:00',leave:'20:00',studentId:'demo-student-a',courseId:'demo-course-a',include:true,remember:false,classChoice:'private',manualMinutes:null,variants:[]}],tutorIndex:0,sourceIndex:0,basis:'tutor',groupId:'',classType:'private',split:false});
  state.importQueue=[{name:'Meet 2026-06-29.xlsx'},{name:'Meet 2026-07-06.xlsx'}];
  state.importDrafts=[d('2026-06-29','Meet 2026-06-29.xlsx'),d('2026-07-06','Meet 2026-07-06.xlsx')];
  state.importDone=[null,null];state.importIndex=0;state.importDraft=state.importDrafts[0];state.view='import';render();
 }''')
 assert page.locator('.import-record-table tbody tr').count()==2
 assert page.locator('.import-date-editor').count()==0,'date editor should be hidden for valid dates'
 assert page.locator('[data-import-date-file]').count()==0
 assert '29/06/2026' in page.locator('.import-record-table').inner_text()
 assert '06/07/2026' in page.locator('.import-record-table').inner_text()
 page.screenshot(path=str(root/'preview-import-dates-v201.png'),full_page=True)
 # Valid dates never show an edit field; missing dates are corrected in the summary only.
 assert page.locator('.import-date-editor').count()==0
 page.evaluate("state.importDrafts[0].date='';state.importDrafts[0].dateSource='missing';render();")
 assert page.locator('[data-import-date-file="0"]').count()==1
 assert page.locator('#import-people input[type="date"]').count()==0
 page.locator('[data-import-date-file="0"]').fill('2026-06-29')
 assert page.evaluate('state.importDrafts[0].date')=='2026-06-29'
 assert page.evaluate('state.importDrafts[1].date')=='2026-07-06'
 page.evaluate("sessionDetail('multi-3')")
 assert '26/10/2026' in page.locator('.session-date-header').inner_text()
 assert page.locator('.related-attendance summary').count()==1
 page.locator('.related-attendance summary').click()
 assert '29/06/2026' in page.locator('.related-attendance').inner_text()
 assert '06/07/2026' in page.locator('.related-attendance').inner_text()
 page.screenshot(path=str(root/'preview-session-dates-v201.png'),full_page=True)
 page.locator('[data-action="student-attendance-history"]').first.click()
 assert page.locator('#history-student').input_value()=='demo-student-a'
 assert page.locator('.history-results tbody tr').count()>=4
 assert '29/06/2026' in page.locator('.history-results').inner_text()
 assert '26/10/2026' in page.locator('.history-results').inner_text()
 # course filter must narrow results correctly
 page.locator('#history-course').select_option('demo-course-b')
 assert page.locator('.history-results tbody tr').count()==1  # empty placeholder
 assert 'ไม่พบคาบเรียน' in page.locator('.history-results').inner_text()
 assert not errors,errors
 print('PASS v2.0.2 import valid dates auto-assigned; summary-only correction, per-file preservation, multi-day modal, full history filtering')
 browser.close()
