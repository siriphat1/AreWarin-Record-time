"""Run: python tests/test_import_date_editor.py -- checks pre-save per-file date corrections"""
from __future__ import annotations
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},locale='th-TH')
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    # Load local HTML, CSS and JS directly. Browser navigation is restricted in this runtime.
    import re
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<script\b[^>]*>.*?</script>', '',html,flags=re.I|re.S)
    html=re.sub(r'<link\b[^>]*>', '',html,flags=re.I|re.S)
    page.set_content(html,wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'assets/style.css').read_text())
    page.add_script_tag(content=(ROOT/'assets/app.js').read_text())
    page.wait_for_function('typeof batchOverview === "function"')
    page.evaluate('''() => {
          const mk = (date, file, conflict=false) => ({filename:file,fingerprint:file,date,dateSource:'filename',dateConflict:conflict,dateNotes:'',
            people:[{name:'Tutor',email:'',segments:[[1140,1200]],actual:60,join:'19:00',leave:'20:00',include:false,studentId:'',courseId:'',manualMinutes:null,variants:[]},
                    {name:'Student',email:'',segments:[[1140,1200]],actual:60,join:'19:00',leave:'20:00',include:true,studentId:'stu1',courseId:'course1',manualMinutes:null,variants:[]}],
            tutorIndex:0,sourceIndex:0,basis:'tutor',groupId:'',classType:'private',split:false});
          state.mode='demo';
          state.data=Object.fromEntries(Object.keys(SCHEMA).map(k=>[k,[]]));
          state.data.Students=[{id:'stu1',name:'Test student',status:'active'}];
          state.data.Courses=[{id:'course1',student_id:'stu1',title:'Test course',cycle_no:1,billing_mode:'hourly',hourly_rate_baht:400,status:'active'}];
          state.importQueue=[new File(['a'],'Meet 2026-09-14.xlsx'),new File(['b'],'Meet 2026-09-21.xlsx'),new File(['c'],'Meet 2026-10-02.xlsx')];
          state.importDrafts=[mk('2026-09-14','Meet 2026-09-14.xlsx'),mk('2026-09-21','Meet 2026-09-21.xlsx'),mk('2026-10-02','Meet 2026-10-02.xlsx')];
          state.importIndex=0;state.importDraft=state.importDrafts[0];state.importDone=['','',''];state.importErrors=['','',''];
          state.importDateEditing=null;state.importIssueOnly=false;state.view='import';render();
        }''')
    dates=page.locator('.import-record-table .import-date-value').all_text_contents()
    assert dates==['14/09/2026','21/09/2026','02/10/2026'],dates
    assert page.locator('[data-action="edit-import-date-file"]').count()==3
    assert page.locator('[data-import-date-file]').count()==0
    # Select first file: date not changed until explicit save.
    page.locator('[data-action="edit-import-date-file"][data-id="0"]').click()
    assert page.locator('#import-date-file-0').count()==1
    page.locator('#import-date-file-0').fill('2026-09-15')
    assert page.evaluate('state.importDrafts[0].date')=='2026-09-14', 'Change before save mutated draft'
    page.locator('[data-action="preview-batch-import"]').first.click()
    assert 'บันทึกวันที่' in page.locator('#toast-root').inner_text(), 'Final review must block unsaved date edits'
    assert page.locator('[role="dialog"]').count()==0
    page.locator('[data-action="cancel-import-date-file"][data-id="0"]').click()
    assert page.evaluate('state.importDrafts[0].date')=='2026-09-14'
    page.locator('[data-action="edit-import-date-file"][data-id="0"]').click()
    page.locator('#import-date-file-0').fill('2026-09-15')
    page.locator('[data-action="save-import-date-file"][data-id="0"]').click()
    assert page.evaluate('state.importDrafts.map(x=>x.date)')==['2026-09-15','2026-09-21','2026-10-02']
    assert page.locator('.import-record-table .import-date-value').all_text_contents()==['15/09/2026','21/09/2026','02/10/2026']
    assert page.locator('.import-date-confirmed').count()==1
    # Confirmation and built payload must use the changed date, not filename day.
    assert page.evaluate('constructImportBatch([0]).sessions[0].date')=='2026-09-15'
    assert page.evaluate('constructImportBatch([0]).imports[0].date')=='2026-09-15'
    assert page.evaluate('constructImportBatch([1]).imports[0].date')=='2026-09-21'
    assert page.evaluate('constructImportBatch([0]).audit[0].details.includes("2026-09-15")')
    # Make a conflicting row: button available even while date unresolved.
    page.evaluate("state.importDrafts[1].dateConflict=true;render();")
    assert page.locator('[data-action="edit-import-date-file"][data-id="1"]').count()==1
    page.locator('[data-action="edit-import-date-file"][data-id="1"]').click()
    page.locator('[data-action="save-import-date-file"][data-id="1"]').click()
    assert not page.evaluate('state.importDrafts[1].dateConflict')
    # Saved imports must not be offered an edit action.
    page.evaluate("state.importDone[2]='saved';render();")
    assert page.locator('[data-action="edit-import-date-file"][data-id="2"]').count()==0
    # screenshot of finished table, only active row edited
    page.screenshot(path=str(ROOT/'preview-v232-date-edit.png'),full_page=True)
    page.locator('.import-summary-panel').screenshot(path=str(ROOT/'preview-v232-import-summary.png'))
    assert not errors,errors
    print('PASS: row editor, cancel, save, per-file isolation, payload, conflicts, saved lock, no browser errors')
    # mobile UI action available
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("state.importDone[2]='';render();")
    page.locator('[data-action="edit-import-date-file"][data-id="0"]').click()
    assert page.locator('#import-date-file-0').count()==1
    page.screenshot(path=str(ROOT/'preview-v232-date-edit-mobile.png'),full_page=True)
    page.locator('.import-summary-panel').screenshot(path=str(ROOT/'preview-v232-import-summary-mobile.png'))
    assert not errors,errors
    print('PASS: mobile date editing renders')
    browser.close()

