from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
source=(root/'assets/app.js').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    for width,height,name in [(1440,900,'desktop'),(390,844,'mobile')]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='domcontentloaded')
        page.evaluate("""() => {const map=new Map();const s={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}""")
        page.add_script_tag(content=source)
        page.evaluate("""() => {store=new DemoStore();state.mode='demo';state.data=makeDemo();state.view='history';state.historyLayout='table';render();}""")
        assert page.locator('.history-metrics>div').count()==3
        assert 'ชั่วโมงสอนตามช่วงเวลา' not in page.locator('main').inner_text()
        assert page.locator('.history-metrics').inner_text().count('ชั่วโมงที่ตัด')==1
        assert page.locator('.history-metrics').inner_text().find('2 ชม.')>=0
        assert page.locator('.history-results th').count()==7
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'),name
        page.screenshot(path=str(root/f'preview-v243-history-{name}.png'),full_page=True)
        page.locator('[data-action="history-view-day"]').click()
        assert page.locator('.history-days').count()==1
        assert '1 คาบ · ตัด 2 ชม.' in page.locator('.history-days').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'),name
        assert not errors,errors
        print('PASS v2.4.3 Learning History',name,'3 metrics, only deduct column, day summary, no viewport overflow')
        page.close()
    browser.close()
