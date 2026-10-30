from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
html=re.sub(r'<link rel="stylesheet" href="assets/style.css[^"]*">','<style>'+(root/'assets/style.css').read_text()+'</style>',html)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1400,'height':1000})
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.evaluate('''() => {const l=new Map(),s=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>l.get(k)||null,setItem:(k,v)=>l.set(k,v),removeItem:k=>l.delete(k)}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>s.get(k)||null,setItem:(k,v)=>s.set(k,v),removeItem:k=>s.delete(k)}});}''')
    page.add_script_tag(content=(root/'assets/app.js').read_text())
    page.get_by_role('button',name='ทดลองข้อมูลจำลอง').click()
    page.evaluate('''() => {
      const d=(date,filename)=>({date,filename,fingerprint:filename,dateSource:date?'filename':'missing',dateConflict:false,people:[{name:'Suthawarin',email:'tutor@example.com',segments:[[1140,1200]],actual:60,join:'19:00',leave:'20:00',studentId:'',courseId:'',include:false,remember:false,classChoice:'private',manualMinutes:null,variants:[]} ,{name:'iPad A',email:'',segments:[[1140,1200]],actual:60,join:'19:00',leave:'20:00',studentId:'demo-student-a',courseId:'demo-course-a',include:true,remember:false,classChoice:'private',manualMinutes:null,variants:[]}],tutorIndex:0,sourceIndex:0,basis:'tutor',groupId:'',classType:'private',split:false});
      state.importQueue=[{name:'Meet 2026-06-29.xlsx'},{name:'Meet 2026-07-06.xlsx'},{name:'Missing date.xlsx'}];
      state.importDrafts=[d('2026-06-29','Meet 2026-06-29.xlsx'),d('2026-07-06','Meet 2026-07-06.xlsx'),d('','Missing date.xlsx')];
      state.importDone=[null,null,null];state.importIndex=0;state.importDraft=state.importDrafts[0];state.view='import';render();
    }''')
    assert page.locator('#import-people input[type="date"]').count()==0
    assert page.locator('.import-date-editor').count()==0
    assert page.locator('[data-action="edit-import-date"]').count()==0
    assert page.locator('[data-import-date-file="0"]').count()==0
    assert page.locator('[data-import-date-file="1"]').count()==0
    assert page.locator('[data-import-date-file="2"]').count()==1
    assert '29/06/2026' in page.locator('.import-record-table').inner_text()
    assert '06/07/2026' in page.locator('.import-record-table').inner_text()
    page.locator('[data-import-date-file="2"]').fill('2026-07-08')
    assert page.evaluate('state.importDrafts[2].date')=='2026-07-08'
    assert page.evaluate('state.importDrafts[0].date')=='2026-06-29'
    assert page.locator('[data-import-date-file="2"]').count()==0
    # When Excel date and filename disagree, correction/confirmation remains in the summary only.
    page.evaluate('''() => {state.importDrafts[1].dateConflict=true;state.importDrafts[1].dateNotes='Excel ≠ filename';render();}''')
    assert page.locator('#import-people input[type="date"]').count()==0
    assert page.locator('[data-import-date-file="1"]').count()==1
    assert page.locator('[data-action="confirm-import-date-file"][data-id="1"]').count()==1
    page.locator('[data-action="confirm-import-date-file"][data-id="1"]').click()
    assert page.evaluate('state.importDrafts[1].dateConflict')==False
    assert page.locator('[data-import-date-file="1"]').count()==0
    assert not errs,errs
    print('PASS v2.0.2 date derived automatically; duplicate editor removed; missing/conflict corrected in summary per-file')
    browser.close()
