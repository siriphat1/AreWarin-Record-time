from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', '', html)
html=re.sub(r'<link rel="stylesheet" href="assets/style.css[^>]+>', '<style>'+(root/'assets/style.css').read_text()+'</style>',html)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,filename in [(1440,1000,'preview-dashboard-desktop.png'),(390,844,'preview-dashboard-mobile.png')]:
  page=browser.new_page(viewport={'width':width,'height':height}, device_scale_factor=1)
  errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda d:d.accept())
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('''() => {const l=new Map(),s=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>l.get(k)||null,setItem:(k,v)=>l.set(k,v),removeItem:k=>l.delete(k)}});Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>s.get(k)||null,setItem:(k,v)=>s.set(k,v),removeItem:k=>s.delete(k)}});}''')
  page.add_script_tag(content=(root/'assets/app.js').read_text())
  page.get_by_role('button',name='ทดลองข้อมูลจำลอง').click()
  page.locator('.dashboard-intro').wait_for(timeout=9000)
  assert page.locator('.today-list').count()==1
  assert page.locator('.quick-tiles button').count()==4
  page.screenshot(path=str(root/filename),full_page=True)
  # search functionality, ctrl-K and navigation
  page.keyboard.press('Control+k')
  page.locator('#global-search-input').fill('น้อง A')
  assert page.locator('[data-action="search-student"]').count()>=1
  page.locator('[data-action="search-student"]').first.click()
  assert page.locator('#profile').count()==1
  # student compact actions dropdown
  assert page.locator('.student-more summary').count()>=1
  page.screenshot(path=str(root/('preview-students-mobile.png' if width<500 else 'preview-students-desktop.png')),full_page=True)
  # import stepper and dropzone
  if width>=761:page.locator('[data-nav-group="attendance"]').click()
  (page.locator('.mobile-bottom-nav [data-view="import"]') if width<761 else page.locator('#nav-sub-attendance .nav-item[data-view="import"]')).click()
  assert page.locator('.import-progress-step').count()==4
  assert page.locator('#excel-dropzone input[type=file][multiple]').count()==1
  page.screenshot(path=str(root/('preview-import-mobile.png' if width<500 else 'preview-import-desktop.png')),full_page=True)
  # interaction visual theme
  page.locator('#theme-switch').click()
  assert page.evaluate("document.body.classList.contains('theme-dark')")
  page.locator('#theme-switch').click()
  assert not page.evaluate("document.body.classList.contains('theme-dark')")
  if width>760:
   page.locator('#sidebar-collapse').click()
   assert page.evaluate("document.body.classList.contains('sidebar-collapsed')")
   page.locator('#sidebar-collapse').click()
   assert not page.evaluate("document.body.classList.contains('sidebar-collapsed')")
  else:
   assert page.locator('.mobile-bottom-nav').is_visible()
   page.locator('.mobile-bottom-nav [data-view="schedule"]').click()
   assert page.locator('.schedule-controls').count()==1
   page.locator('#mobile-more-btn').click()
   assert page.locator('#sidebar').evaluate('(e)=>e.classList.contains("open")')
  assert not errors,errors
  # no horizontal overflow on primary page with menus; grids may have intentional horizontal scrolling inside them
  print('PASS',width,'desktop/mobile, search, profile, import, theme, navigation')
  page.close()
 browser.close()
