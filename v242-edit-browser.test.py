from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
source=(root/'assets/app.js').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    for width,height,label in [(1440,900,'desktop'),(390,844,'mobile')]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('dialog',lambda d:d.accept())
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded')
        page.evaluate("""() => {const memory=new Map();const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}""")
        page.add_script_tag(content=source)
        page.evaluate("""() => {
          store=new DemoStore();state.data=makeDemo();state.mode='demo';
          const a=state.data.Attendance[0];a.join_time='16:33';a.leave_time='17:09';a.actual_minutes=36;a.deduct_minutes=36;
          state.data.Ledger.find(l=>l.session_id==='demo-session').minutes=-36;
          localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));render();editAttendance(a.id);
        }""")
        assert page.locator('#edit-att-form').is_visible()
        assert page.locator('#edit-actual').count()==0
        assert page.locator('#edit-minutes').count()==0
        assert '36 นาที' in page.locator('.edit-att-comparison').inner_text()
        assert '35 นาที' not in page.locator('#edit-att-duration').inner_text()
        page.locator('#edit-leave').fill('17:08')
        assert page.locator('#edit-att-duration').inner_text()=='35 นาที'
        assert page.locator('#edit-att-new').inner_text()=='35 นาที'
        assert page.locator('#edit-att-difference').inner_text()=='คืน 1 นาที'
        assert page.locator('#edit-att-submit').is_enabled()
        page.screenshot(path=str(root/f'preview-v242-edit-attendance-{label}.png'),full_page=False)
        page.locator('#edit-leave').fill('16:33')
        assert page.locator('#edit-att-submit').is_disabled()
        assert page.locator('#edit-att-error').is_visible()
        page.locator('#edit-leave').fill('17:08')
        page.locator('#edit-reason').fill('แก้เวลาตามจริง')
        page.locator('#edit-att-submit').click()
        page.wait_for_timeout(180)
        a=page.evaluate('state.data.Attendance[0]')
        assert a['actual_minutes']==35 and a['deduct_minutes']==35,a
        assert page.evaluate("all('Ledger').at(-1).minutes")==1
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'),(label,'horizontal overflow')
        assert not errors,errors
        print(f'PASS v2.4.2 browser {label}: live minutes, read-only deduction, validation, +1 Ledger, save')
        page.close()
    browser.close()
