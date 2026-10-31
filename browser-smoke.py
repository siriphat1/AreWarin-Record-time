from pathlib import Path
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width in [('desktop',1366),('mobile',390)]:
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<html lang="th"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>')
  page.add_style_tag(content=(ROOT/'student/style.css').read_text())
  page.evaluate("Object.defineProperty(window,'sessionStorage',{configurable:true,value:{_data:{},getItem(k){return this._data[k]||null},setItem(k,v){this._data[k]=v},removeItem(k){delete this._data[k]}}});")
  page.evaluate('''() => {window.PortalBridge={call:async (name,args)=>{if(name==='requestPhoneOtp')return {sent:true,phoneHint:'•••5678'};if(name==='activateWithPhone'){if(args[2]!=='123456')throw Error('OTP ไม่ถูกต้อง');return {token:'T'.repeat(96)};}if(name==='getMyData')return {student:{name:'Test Student',code:'26-0003',school:'',grade:''},courses:[],attendance:[],schedule:[],billing:[],leave:[],makeup:[],requests:[],lessonNotes:[],bank:{}};throw Error('Unknown '+name);}}}''')
  page.add_script_tag(content=(ROOT/'student/app.js').read_text())
  page.locator('#toggle-auth').click()
  assert page.get_by_text('เบอร์โทรศัพท์ที่ลงทะเบียนไว้กับติวเตอร์').count()==1
  assert page.locator('#activate-key').count()==0
  page.locator('#login-code').fill('26-0003');page.locator('#activate-phone').fill('0812345678')
  page.locator('#send-otp').click();page.wait_for_timeout(50)
  page.locator('#activate-otp').fill('123456')
  page.locator('#login-pin').fill('1234');page.locator('#login-pin2').fill('1234')
  page.locator('#auth-form button[type=submit]').click()
  page.get_by_text('Test Student').first.wait_for(timeout=9000)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'horizontal overflow '+name
  assert not errors,errors
  print('PASS student',name,'OTP UI, first PIN, dashboard and no page errors')
  page.close()

 html=(ROOT/'tutor-os-update/index.html').read_text()
 scripts=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',html,re.S)
 stripped=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S|re.I)
 stripped=re.sub(r'<script\b[^>]*></script>','',stripped,flags=re.S|re.I)
 stripped=re.sub(r'<link\b[^>]*>','',stripped,flags=re.I)
 for name,width in [('desktop',1366),('mobile',390)]:
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(stripped,wait_until='domcontentloaded',timeout=30000)
  page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,value:{_data:{},getItem(k){return this._data[k]||null},setItem(k,v){this._data[k]=v},removeItem(k){delete this._data[k]}}});")
  for code in scripts:
   if code.strip(): page.add_script_tag(content=code)
  page.wait_for_timeout(150)
  page.evaluate("state.mode='demo';state.data=makeDemo();state.view='portal';render()")
  assert page.get_by_text('แก้เบอร์โทร').count()>0
  first=page.locator('[data-action="portal-phone"]').first
  first.click()
  assert page.locator('#pm-phone-input').count()==1
  page.locator('#pm-phone-input').fill('0812345678')
  # DemoStore must have the matching state persisted because commit uses localStorage.
  page.evaluate("localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data))")
  page.locator('[data-action="portal-phone-save"]').click()
  page.wait_for_timeout(350)
  # The UI may render async; verify persistence and no errors.
  result=page.evaluate("({students:all('Students').length,hasPhone:all('Students').some(x=>x.phone==='0812345678')})")
  assert result['hasPhone'],result
  assert not errors,errors
  print('PASS admin',name,'Phone editor, save persists to Students, no JS error')
  page.close()
 browser.close()
