from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
script=(root/'assets/app.js').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for width,height,label in [(1366,900,'desktop'),(390,844,'mobile')]:
  page=b.new_page(viewport={'width':width,'height':height})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('''() => {let db=new Map();let s={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s});}''')
  page.add_script_tag(content=script)
  page.evaluate("() => {store=new DemoStore();state.mode='demo';state.data=makeDemo();state.view='dashboard';render();}")
  assert page.locator('#nav .nav-group-toggle').count()==5
  assert page.locator('#nav .nav-home').count()==1
  assert page.locator('#nav .nav-subitem').count()==16
  assert page.locator('#nav .nav-subitem:visible').count()==0
  assert page.locator('.workspace-tabs').count()==0
  if label=='mobile':
   page.locator('#menu-toggle').click()
   assert page.locator('#sidebar').evaluate('(el)=>el.classList.contains("open")')
  page.locator('[data-nav-group="students"]').click()
  assert page.locator('#nav-sub-students .nav-subitem:visible').count()==3
  assert page.locator('#nav-sub-attendance .nav-subitem:visible').count()==0
  page.locator('#nav-sub-students [data-view="groups"]').click()
  assert page.locator('#nav .nav-group[data-group="students"]').get_attribute('class').find('has-active')>=0
  assert page.locator('.workspace-tabs .workspace-tab').count()==3
  assert page.locator('.workspace-tab.active').inner_text()=='กลุ่มเรียน'
  if label=='mobile':
   assert 'open' not in (page.locator('#sidebar').get_attribute('class') or '')
   page.locator('#menu-toggle').click()
  page.locator('[data-nav-group="attendance"]').click()
  assert page.locator('#nav-sub-attendance .nav-subitem:visible').count()==4
  assert page.locator('#nav-sub-students .nav-subitem:visible').count()==0
  page.locator('#nav-sub-attendance [data-view="import"]').click()
  assert page.locator('.workspace-tabs .workspace-tab').count()==4
  assert page.locator('.workspace-tab.active').inner_text()=='นำเข้า Google Meet'
  page.locator('.workspace-tabs [data-view="history"]').click()
  assert page.locator('#nav-sub-attendance .nav-subitem.active').count()==1
  assert page.locator('.workspace-tab.active').inner_text()=='ประวัติการเรียน'
  # Clicking a category twice collapses the submenu; data remains untouched.
  if label=='mobile':page.locator('#menu-toggle').click()
  page.locator('[data-nav-group="attendance"]').click()
  assert page.locator('#nav-sub-attendance .nav-subitem:visible').count()==0
  page.locator('[data-nav-group="attendance"]').click()
  assert page.locator('#nav-sub-attendance .nav-subitem:visible').count()==4
  if label=='mobile':
   page.locator('#mobile-more-btn').click() if not page.locator('#sidebar').evaluate('(el)=>el.classList.contains("open")') else None
   page.screenshot(path=str(root/'preview-v231-mobile-navigation.png'))
  else:
   page.screenshot(path=str(root/'preview-v231-desktop-expanded.png'))
   page.locator('#sidebar-collapse').click()
   assert page.evaluate("document.body.classList.contains('sidebar-collapsed')")
   assert page.locator('#nav .nav-subitem:visible').count()==0
   assert page.locator('#nav .nav-group-toggle:visible').count()==5
   assert page.evaluate("document.querySelector('#sidebar').scrollHeight <= document.querySelector('#sidebar').clientHeight+2")
   page.screenshot(path=str(root/'preview-v231-desktop-collapsed.png'))
   page.locator('[data-nav-group="finance"]').click()
   assert not page.evaluate("document.body.classList.contains('sidebar-collapsed')")
   assert page.locator('#nav-sub-finance .nav-subitem:visible').count()==3
   page.locator('#sidebar-collapse').click()
   page.locator('#sidebar-collapse').click()
   assert not page.evaluate("document.body.classList.contains('sidebar-collapsed')")
   # Regular route links from all major categories remain functional.
   page.locator('#nav-sub-finance [data-view="billing"]').click()
   assert page.locator('.workspace-tab.active').inner_text()=='ค่าคาบรายชั่วโมง'
   page.locator('[data-nav-group="admin"]').click()
   page.locator('#nav-sub-admin [data-view="system"]').click()
   assert page.locator('.workspace-tab.active').inner_text()=='ตรวจสอบ / สำรองข้อมูล'
  assert not errors,errors
  assert page.evaluate('all("Students").length')>=2
  print('PASS',label,'grouped navigation, submenus, sections, route changes, responsive')
  page.close()
 b.close()
