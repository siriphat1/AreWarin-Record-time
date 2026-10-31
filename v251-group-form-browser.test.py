from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
html=re.sub(r'<link[^>]+href="(?:https://|assets/style.css)[^"]+"[^>]*>','',html)
html=html.replace('</head>','<style>'+(root/'assets/style.css').read_text()+'</style></head>')
src=(root/'assets/app.js').read_text()
portal_src=(root/'assets/portal-manager.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 for width,height,label in [(1440,900,'desktop'),(390,844,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':height})
  page.set_default_timeout(9000)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('''() => {const map=new Map();const fake={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:fake});Object.defineProperty(window,'sessionStorage',{configurable:true,value:fake});}''')
  page.add_script_tag(content=src)
  page.add_script_tag(content=portal_src)
  errors.clear()  # The HTML in production loads both defer scripts before DOMContentLoaded.
  page.evaluate('''() => {store=new DemoStore();state.data=makeDemo();state.mode='demo';
   state.data.Students.push({id:'group-student-1',name:'น้องแอร์พอร์ต',school:'โรงเรียนตัวอย่าง',grade_level:'ม.6',status:'active',created_at:now()});
   state.data.Students.push({id:'group-student-2',name:'น้องมิลิน',school:'โรงเรียนวิทยาศาสตร์',grade_level:'ม.5',status:'active',created_at:now()});
   state.data.Students.push({id:'group-student-3',name:'น้องพลอยพลอย',status:'active',created_at:now()});
   state.data.Students.push({id:'group-student-4',name:'นักเรียนทดสอบชื่อยาวมากเพื่อดูว่าตัดคำแล้วไม่เบียดออกจากจอ',status:'active',created_at:now()});
   localStorage.setItem('awtutor_v1_demo',JSON.stringify(state.data));go('groups');openGroupForm();}''')
  # Scoped checkbox geometry is fixed and labels are laid out horizontally.
  rows=page.locator('#group-form .group-member-row')
  assert rows.count()>=4
  row=page.locator('#group-form .group-member-row').filter(has_text='น้องแอร์พอร์ต')
  cb=row.locator('input[name="member"]')
  b1,b2=cb.bounding_box(),row.locator('.group-member-text').bounding_box()
  assert b1 and b2 and 15<=b1['width']<=20 and 15<=b1['height']<=20, b1
  assert b2['x'] > b1['x']+b1['width'] and b2['width']>90,(b1,b2)
  assert row.locator('strong').inner_text()=='น้องแอร์พอร์ต'
  assert row.locator('small').inner_text()=='โรงเรียนตัวอย่าง · ม.6'
  assert not page.evaluate('document.querySelector("#modal-root .modal").scrollWidth > document.querySelector("#modal-root .modal").clientWidth+2')
  page.screenshot(path=str(root/f'preview-group-form-v251-{label}.png'),full_page=False)
  # Search and select all matching rows without losing other selections.
  page.locator('#group-member-search').fill('มิลิน')
  assert page.locator('#group-form .group-member-row:visible').count()==1
  assert 'พบ 1' in page.locator('#group-member-visible-count').inner_text()
  page.locator('[data-action="group-select-visible"]').click()
  assert page.locator('#group-member-count').inner_text().startswith('เลือกแล้ว 1 คน')
  assert page.locator('#group-form input[name="member"]:checked').count()==1
  page.locator('#group-member-search').fill('')
  row.locator('input[name="member"]').check()
  assert page.locator('#group-member-count').inner_text().startswith('เลือกแล้ว 2 คน')
  page.locator('#group-name').fill('กลุ่มชีววิทยาใหม่')
  page.locator('#group-form button[type="submit"]').click()
  page.wait_for_timeout(200)
  result=page.evaluate('''() => {const g=all('Groups').find(g=>g.name==='กลุ่มชีววิทยาใหม่');return g?{id:g.id,members:g.member_ids,history:all('GroupMemberships').filter(m=>m.group_id===g.id&&m.status==='active').length}:null;}''')
  assert result and len(result['members'].split('|'))==2 and result['history']==2,result
  page.evaluate('''() => {openGroupForm(all('Groups').find(g=>g.name==='กลุ่มชีววิทยาใหม่'));}''')
  assert page.locator('#group-form input[name="member"]:checked').count()==2
  page.locator('#group-member-search').fill('น้องมิลิน')
  page.locator('[data-action="group-select-visible"]').click()
  assert page.locator('#group-form input[name="member"]:checked').count()==1
  page.locator('#group-form button[type="submit"]').click()
  page.wait_for_timeout(160)
  result2=page.evaluate('''() => {const g=all('Groups').find(g=>g.name==='กลุ่มชีววิทยาใหม่');return {members:g.member_ids,old:all('GroupMemberships').filter(m=>m.group_id===g.id&&m.student_id==='group-student-2').map(m=>m.status)};}''')
  assert 'group-student-1' in result2['members'] and 'group-student-2' not in result2['members'],result2
  assert 'left' in result2['old'],result2
  assert not errors,errors
  print('PASS',label,'checkbox 18px, accessible rows, search/filter, select visible, create/edit membership, no modal overflow')
  page.close()
 browser.close()
