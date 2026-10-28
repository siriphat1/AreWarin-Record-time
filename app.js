/* AreWarin Tutor OS v1.7.1 — standalone GitHub Pages + Google Sheets API application.
 * Demo persistence: localStorage. Live: Google OAuth + private Google Sheets.
 * Never embed credentials or client secrets in a public repository.
 */
'use strict';
const SCHEMA = {
  Students:['id','name','email','aliases','status','created_at','notes','full_name','school','grade_level','academic_year','updated_at'],
  Courses:['id','student_id','title','cycle_no','start_date','purchased_minutes','status','previous_course_id','created_at','closed_at'],
  Groups:['id','name','member_ids','created_at'],
  Schedules:['id','date','student_id','group_id','start_time','end_time','tutor','repeat_rule','status','notes','created_at'],
  Sessions:['id','date','start_time','end_time','mode','group_id','tutor','time_source','status','source_file','notes','created_at'],
  Attendance:['id','session_id','student_id','course_id','join_time','leave_time','actual_minutes','deduct_minutes','status','source_name','created_at'],
  Ledger:['id','student_id','course_id','session_id','type','minutes','note','created_at'],
  Imports:['id','fingerprint','filename','date','session_id','created_at'],
  Audit:['id','action','target_id','details','created_at'],
  MeetAliases:['id','student_id','meet_name','email','normalized_name','normalized_email','status','verified_at','created_at'],
  GroupMemberships:['id','group_id','student_id','joined_at','left_at','status','created_at'],
  ClassRules:['id','scope_type','scope_id','basis','rounding_minutes','minimum_minutes','updated_at'],
  CoursePolicies:['id','course_id','expires_on','rollover_policy','updated_at'],
  StudentEducationHistory:['id','student_id','old_school','old_grade_level','old_academic_year','new_school','new_grade_level','new_academic_year','changed_at']
};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>{const m=Math.max(0,Math.round(Number(n)||0));return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
const nice=n=>{const m=Math.max(0,Math.round(Number(n)||0)),h=Math.floor(m/60),r=m%60;return h?(r?`${h} ชม. ${r} นาที`:`${h} ชม.`):`${r} นาที`;};
const num=n=>Math.round(Number(n)||0);
const uuid=()=>((typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const dateNow=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'});
const now=()=>new Date().toISOString();
const inputVal=(form,name)=>String(new FormData(form).get(name)||'').trim();
function minutesOf(s){const m=String(s||'').match(/^(\d{1,2}):(\d\d)(?::\d\d)?$/);if(!m)return NaN;const h=+m[1],mm=+m[2];return h<24&&mm<60?h*60+mm:NaN;}
function duration(start,end){const a=minutesOf(start),b=minutesOf(end);if(!Number.isFinite(a)||!Number.isFinite(b))return NaN;let d=b-a;if(d<0)d+=1440;return d;}
const row=(name,obj)=>SCHEMA[name].map(k=>obj[k]??'');
const obj=(name,values)=>Object.fromEntries(SCHEMA[name].map((k,i)=>[k,values[i]??'']));
const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
function dateValid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T00:00:00Z').getTime())&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
const all=(sheet)=>state.data[sheet]||[];
const byId=(sheet,id)=>all(sheet).find(x=>x.id===id);
const coursesOf=id=>all('Courses').filter(c=>c.student_id===id).sort((a,b)=>num(b.cycle_no)-num(a.cycle_no));
const liveCourses=id=>coursesOf(id).filter(c=>c.status==='active'||c.status==='held');
const studentName=id=>byId('Students',id)?.name||'ไม่พบนักเรียน';
const courseTitle=id=>{const c=byId('Courses',id);return c?`${c.title} · รอบ ${c.cycle_no}`:'ไม่พบคอร์ส';};
const balance=id=>all('Ledger').filter(l=>l.course_id===id).reduce((s,l)=>s+num(l.minutes),0);
const currentStudentTotal=id=>liveCourses(id).reduce((s,c)=>s+balance(c.id),0);
const pill=(txt,tone='')=>`<span class="badge ${tone}">${esc(txt)}</span>`;
const options=(arr,selected='',placeholder='เลือก...',val='id',label='name')=>`<option value="">${esc(placeholder)}</option>`+arr.map(it=>`<option value="${esc(it[val])}" ${String(it[val])===String(selected)?'selected':''}>${esc(it[label])}</option>`).join('');
const studentOptions=(selected='')=>options(all('Students').filter(x=>x.status==='active').sort((a,b)=>a.name.localeCompare(b.name,'th')),selected,'— เลือกนักเรียน —');
const courseOptions=(studentId,selected='')=>options(liveCourses(studentId).map(c=>({id:c.id,name:`${c.title} · รอบ ${c.cycle_no} · คงเหลือ ${fmt(balance(c.id))}`})),selected,'— เลือกคอร์ส —');

const activeAliasRows=()=>all('MeetAliases').filter(a=>a.status==='active'&&byId('Students',a.student_id)?.status==='active');
function identityCandidates(name,email){
  const n=norm(name),e=norm(email),students=activeStudents();
  const rows=activeAliasRows(),found=new Map();
  const put=(id,source,weight)=>{const prev=found.get(id);if(!prev||prev.weight<weight)found.set(id,{id,source,weight});};
  for(const x of students){
    if(e&&norm(x.email)===e)put(x.id,'Student email',110);
    if(n&&norm(x.name)===n)put(x.id,'Student name',85);
    for(const alias of String(x.aliases||'').split(',').map(norm).filter(Boolean))if(n===alias||e===alias)put(x.id,'Legacy alias',95);
  }
  for(const a of rows){
    if(e&&a.normalized_email===e)put(a.student_id,'Verified Meet email',120);
    if(n&&a.normalized_name===n)put(a.student_id,'Verified Meet name',100);
  }
  return [...found.values()].sort((a,b)=>b.weight-a.weight);
}
function resolveMeetIdentity(name,email){
  const hits=identityCandidates(name,email),ids=[...new Set(hits.map(h=>h.id))];
  if(!hits.length)return {studentId:'',level:'unknown',reason:'ยังไม่เคยจับคู่ชื่อ Meet นี้'};
  // Never silently bind when a valid identity points to two different student IDs.
  if(ids.length>1)return {studentId:'',level:'conflict',reason:'ชื่อ/อีเมลอาจตรงกับนักเรียนหลายคน: '+hits.map(h=>studentName(h.id)).join(' / ')};
  return {studentId:hits[0].id,level:'match',reason:'จดจำจาก '+hits[0].source};
}
function aliasConflict(name,email,studentId){
  const hits=identityCandidates(name,email).filter(h=>h.id!==studentId);
  return hits.length?hits.map(h=>studentName(h.id)).join(', '):'';
}
function aliasExists(name,email,studentId){return activeAliasRows().some(a=>a.student_id===studentId&&norm(a.meet_name)===norm(name)&&norm(a.email)===norm(email));}
function aliasRow(studentId,name,email){const time=now();return {id:uuid(),student_id:studentId,meet_name:name,email,normalized_name:norm(name),normalized_email:norm(email),status:'active',verified_at:time,created_at:time};}
function membersOf(groupId){const group=byId('Groups',groupId);return (group?.member_ids||'').split('|').filter(id=>byId('Students',id)?.status==='active');}
function groupsOfStudent(studentId){return all('Groups').filter(g=>membersOf(g.id).includes(studentId));}
function recommendedGroup(d){const selected=d.people.filter((p,i)=>i!==d.tutorIndex&&p.studentId&&p.include).map(p=>p.studentId);if(!selected.length)return null;const date=d.date;const candidates=all('Groups').filter(g=>selected.every(id=>membersOf(g.id).includes(id)));const planned=all('Schedules').filter(sc=>sc.group_id&&sc.status==='active'&&sc.date===date).map(s=>s.group_id);return candidates.find(g=>planned.includes(g.id))||candidates[0]||null;}
function coursePolicy(courseId){return all('CoursePolicies').find(x=>x.course_id===courseId);}
function ruleFor(type,id){return all('ClassRules').find(r=>r.scope_type===type&&r.scope_id===id);}
function adjustedByRule(minutes,rule){let n=Number(minutes);if(!rule)return Math.round(n);const unit=Number(rule.rounding_minutes)||1,minimum=Number(rule.minimum_minutes)||0;if(n>0&&unit>1)n=Math.ceil(n/unit)*unit;if(n>0)n=Math.max(minimum,n);return Math.round(n);}
function proposedCourse(studentId,type,groupId){const cs=liveCourses(studentId);if(!cs.length)return null;const key=type==='group'?norm(byId('Groups',groupId)?.name):'';if(key){return cs.find(c=>norm(c.title)===key)||cs.find(c=>key.includes(norm(c.title))||norm(c.title).includes(key))||cs[0];}return cs[0];}
function toast(msg,error=false){const el=$('#toast-root');el.innerHTML=`<div class="toast ${error?'error':''}">${esc(msg)}</div>`;setTimeout(()=>{if(el)el.innerHTML=''},4300);}
function modal(title,body,footer='',wide=false){$('#modal-root').innerHTML=`<div class="overlay" id="overlay"><div class="modal ${wide?'modal-wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-top"><h2 class="modal-title">${esc(title)}</h2><button class="xbtn" data-close>×</button></div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</div></div>`;}
function closeModal(){$('#modal-root').innerHTML='';}
function notice(e){toast(e?.message||String(e),true);console.error(e);}
const head=(ey,title,desc,action='')=>`<div class="page-header"><div><div class="eyebrow">${ey}</div><h1>${title}</h1><p class="subtle">${desc}</p></div>${action}</div>`;
const field=(name,label,type='text',value='',extra='')=>`<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
const selectField=(name,label,opts,extra='')=>`<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}" ${extra}>${opts}</select></div>`;
const btn=(label,action,extra='')=>`<button type="button" class="btn ${extra}" data-action="${action}">${label}</button>`;
let store=null;
// Public IDs may be stored in localStorage; OAuth credentials never are.
const config=window.TUTOR_CONFIG||{};
const SETTINGS_KEY='awtutor_connection_settings_v1';
const SESSION_KEY='awtutor_google_session_v1';
function safeStorage(area,operation,key,value){try{const target=area==='session'?window.sessionStorage:window.localStorage;return operation==='get'?target.getItem(key):operation==='remove'?target.removeItem(key):target.setItem(key,value);}catch{return null;}}
function savedPublicSettings(){try{return JSON.parse(safeStorage('local','get',SETTINGS_KEY)||'null')||{};}catch{return {};}}
const rememberedSettings=savedPublicSettings();
if(rememberedSettings.googleClientId&&rememberedSettings.spreadsheetId){config.googleClientId=rememberedSettings.googleClientId;config.spreadsheetId=rememberedSettings.spreadsheetId;}
let liveConfigured=!!(config.googleClientId&&config.spreadsheetId);
function clearGoogleSession(){safeStorage('session','remove',SESSION_KEY);}
function rememberGoogleSession(token,expiresIn){if(!token)return;const validSeconds=Math.max(0,Number(expiresIn)||3600);safeStorage('session','set',SESSION_KEY,JSON.stringify({token,expiresAt:Date.now()+Math.max(0,validSeconds-90)*1000,clientId:config.googleClientId,spreadsheetId:config.spreadsheetId}));}
function connectionGate(){return `${head('SECURE CONNECTION','เชื่อม Google Sheets','ระบบจะเปิดฐานข้อมูลจริงโดยตรง ไม่แสดงข้อมูลจำลองแทนข้อมูลจริง')}
<section class="panel connection-gate"><div class="connection-gate-icon">⌁</div><h2>${liveConfigured?'เชื่อมต่อบัญชี Google เพื่อเปิดข้อมูลนักเรียน':'ตั้งค่าฐานข้อมูลครั้งแรก'}</h2><p>${liveConfigured?'การตั้งค่า Spreadsheet ได้รับการจดจำแล้ว เมื่อสิทธิ์ Google หมดอายุให้กดเชื่อมต่อเพียงปุ่มเดียว ไม่ต้องเข้าหน้า Settings':'ตั้งค่า Google OAuth Client ID และ Spreadsheet ID ครั้งเดียว ระบบจะจำค่าที่ไม่ใช่รหัสลับบนอุปกรณ์นี้'}</p><div class="button-row">${liveConfigured?btn('เชื่อม Google Sheets','google-signin','primary'):btn('ตั้งค่า Google Sheets','connection','primary')} ${btn('ทดลองข้อมูลจำลอง','demo-mode','soft')}</div><small>ความปลอดภัย: ไม่เก็บ Client Secret หรือรหัสผ่าน และไม่เปิดข้อมูลนักเรียนแบบสาธารณะ</small></section>`;}
async function restoreGoogleSession(){if(!liveConfigured)return false;
 let saved;try{saved=JSON.parse(safeStorage('session','get',SESSION_KEY)||'null');}catch{saved=null;}
 if(!saved||!saved.token||saved.expiresAt<=Date.now()||saved.clientId!==config.googleClientId||saved.spreadsheetId!==config.spreadsheetId){clearGoogleSession();state.mode='needs_login';render();return false;}
 try{state.token=saved.token;store=new SheetsStore(saved.token);state.data=await store.load();state.mode='live';render();return true;}
 catch(err){clearGoogleSession();state.token='';store=new DemoStore();state.mode='needs_login';render();console.warn('Session could not be restored:',err?.message||err);return false;}
}

const state={scheduleLayout:safeStorage('local','get','awtutor_schedule_layout_v1')==='table'?'table':'week',scheduleWeek:'',view:'dashboard',data:{},mode:liveConfigured?'needs_login':'setup_required',token:'',tokenClient:null,studentId:'',showArchive:false,showDeleted:false,studentLayout:'cards',studentGradeFilter:'all',studentStatusFilter:'all',importQueue:[],importDrafts:[],importErrors:[],importDone:[],importLoading:false,importIndex:0,importDraft:null,importIssueOnly:false,importCurrentOnly:false,historyTutor:'',historyStudent:'',historyGroup:'',historyCourse:'',historyStatus:'all',historyFrom:'',historyTo:'',historyLayout:'table',bulkScope:'current',bulkClass:'keep',bulkBasis:'keep',bulkMinutes:'',bulkRemember:false,batchIncluded:{},reviewSelection:[],search:'',filter:'all',busy:false};
function makeDemo(){
  const empty=Object.fromEntries(Object.keys(SCHEMA).map(k=>[k,[]]));
  const t=now(),ds=dateNow();
  const s1={id:'demo-student-a',name:'น้อง A',email:'',aliases:'A Biology, iPad A',status:'active',created_at:t,notes:'ตัวอย่างนักเรียน',full_name:'นักเรียนตัวอย่าง A',school:'โรงเรียนตัวอย่าง',grade_level:'ม.5',academic_year:'2569',updated_at:t};
  const s2={id:'demo-student-b',name:'น้อง B',email:'',aliases:'',status:'active',created_at:t,notes:'',full_name:'นักเรียนตัวอย่าง B',school:'โรงเรียนตัวอย่างแห่งที่ 2',grade_level:'ม.6',academic_year:'2569',updated_at:t};
  const c1={id:'demo-course-a',student_id:s1.id,title:'Biology Olympiad',cycle_no:2,start_date:ds,purchased_minutes:600,status:'active',previous_course_id:'demo-course-old',created_at:t,closed_at:''};
  const cold={id:'demo-course-old',student_id:s1.id,title:'Biology Olympiad',cycle_no:1,start_date:'2026-09-01',purchased_minutes:600,status:'archived',previous_course_id:'',created_at:t,closed_at:t};
  const c2={id:'demo-course-b',student_id:s2.id,title:'A-Level Biology',cycle_no:1,start_date:ds,purchased_minutes:720,status:'active',previous_course_id:'',created_at:t,closed_at:''};
  empty.Students=[s1,s2];empty.Courses=[c1,cold,c2];
  empty.Groups=[{id:'demo-group-1',name:'Biology Olympiad 01',member_ids:s1.id+'|'+s2.id,created_at:t}];
  empty.GroupMemberships=[s1,s2].map(s=>({id:uuid(),group_id:'demo-group-1',student_id:s.id,joined_at:ds,left_at:'',status:'active',created_at:t}));
  empty.MeetAliases=[{id:uuid(),student_id:s1.id,meet_name:'A Biology',email:'',normalized_name:norm('A Biology'),normalized_email:'',status:'active',verified_at:t,created_at:t}];
  empty.Ledger=[
    {id:uuid(),student_id:s1.id,course_id:cold.id,session_id:'',type:'purchase',minutes:600,note:'ซื้อรอบแรก',created_at:t},
    {id:uuid(),student_id:s1.id,course_id:cold.id,session_id:'',type:'deduct',minutes:-600,note:'ตัวอย่างประวัติเก่า',created_at:t},
    {id:uuid(),student_id:s1.id,course_id:c1.id,session_id:'',type:'purchase',minutes:600,note:'ต่อคอร์สใหม่',created_at:t},
    {id:uuid(),student_id:s1.id,course_id:c1.id,session_id:'demo-session',type:'deduct',minutes:-120,note:'คาบตัวอย่าง',created_at:t},
    {id:uuid(),student_id:s2.id,course_id:c2.id,session_id:'',type:'purchase',minutes:720,note:'ลงทะเบียน',created_at:t}
  ];
  empty.Sessions=[{id:'demo-session',date:ds,start_time:'18:00',end_time:'20:00',mode:'manual',group_id:'',tutor:'Tutor',time_source:'tutor',status:'approved',source_file:'',notes:'คาบตัวอย่าง',created_at:t}];
  empty.Attendance=[{id:uuid(),session_id:'demo-session',student_id:s1.id,course_id:c1.id,join_time:'18:00',leave_time:'20:00',actual_minutes:120,deduct_minutes:120,status:'approved',source_name:'',created_at:t}];
  return empty;
}
function normalizeData(data){for(const key of Object.keys(SCHEMA))if(!Array.isArray(data[key]))data[key]=[];return data;}
class DemoStore{
  async load(){let raw=localStorage.getItem('awtutor_v1_demo');if(!raw){const demo=makeDemo();localStorage.setItem('awtutor_v1_demo',JSON.stringify(demo));return demo;}try{return normalizeData(JSON.parse(raw));}catch{return makeDemo();}}
  async commit(changes){const d=await this.load();Object.entries(changes.update||{}).forEach(([k,rows])=>rows.forEach(change=>{const i=d[k].findIndex(x=>x.id===change.id);if(i<0)throw Error('Row not found');d[k][i]=change;}));Object.entries(changes.add||{}).forEach(([k,rows])=>d[k].push(...rows));localStorage.setItem('awtutor_v1_demo',JSON.stringify(d));return d;}
}
class SheetsStore{
  constructor(token){this.token=token;this.sids={};}
  async request(path,method='GET',payload){const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(config.spreadsheetId)+path,{method,headers:{Authorization:'Bearer '+this.token,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});if(!res.ok){const err=await res.json().catch(()=>({}));let reason=err.error?.message||`HTTP ${res.status}`;if(res.status===401){reason+=' · สิทธิ์หมดอายุ กดเชื่อมบัญชีอีกครั้ง';clearGoogleSession();state.token='';state.mode='needs_login';if(document.querySelector('#app'))render();}throw Error(reason);}return res.json();}
  async load(){const meta=await this.request('?fields=sheets(properties(sheetId,title))');this.sids=Object.fromEntries(meta.sheets.map(s=>[s.properties.title,s.properties.sheetId]));for(const name of Object.keys(SCHEMA))if(this.sids[name]===undefined)throw Error('ไม่พบชีต '+name+' — กรุณารัน setupTutorOS() ก่อน');const ranges=Object.keys(SCHEMA).map(s=>`${s}!A2:${String.fromCharCode(64+SCHEMA[s].length)}10000`);const data=await this.request('/values:batchGet?ranges='+ranges.map(encodeURIComponent).join('&ranges=')+'&valueRenderOption=UNFORMATTED_VALUE');return Object.fromEntries(Object.keys(SCHEMA).map((s,i)=>[s,(data.valueRanges[i]?.values||[]).filter(row=>row.some(v=>v!==''&&v!==null)).map(r=>obj(s,r))]));}
  async commit(changes){const requests=[];const latest=state.data;for(const [sheet,updates] of Object.entries(changes.update||{})){const ids=latest[sheet].map(x=>x.id);for(const value of updates){const i=ids.indexOf(value.id);if(i<0)throw Error(`Row ${value.id} not found`);requests.push({updateCells:{range:{sheetId:this.sids[sheet],startRowIndex:i+1,endRowIndex:i+2,startColumnIndex:0,endColumnIndex:SCHEMA[sheet].length},rows:[{values:row(sheet,value).map(toCell)}],fields:'userEnteredValue'}});}}for(const [sheet,adds] of Object.entries(changes.add||{})){if(!adds.length)continue;requests.push({appendCells:{sheetId:this.sids[sheet],rows:adds.map(a=>({values:row(sheet,a).map(toCell)})),fields:'userEnteredValue'}});}if(!requests.length)return state.data;await this.request(':batchUpdate','POST',{requests});return this.load();}
}
function toCell(value){if(typeof value==='number')return {userEnteredValue:{numberValue:value}};return {userEnteredValue:{stringValue:String(value??'')}};}
async function reload(){state.data=await store.load();render();}
async function commit(changes){if(state.busy)throw Error('กำลังบันทึกข้อมูล');state.busy=true;try{state.data=await store.commit(changes);render();}finally{state.busy=false;}}
function saveAudit(action,target,details){return {id:uuid(),action,target_id:target,details:JSON.stringify(details||{}),created_at:now()};}

let pendingSummaryAction=null;
// Every confirmed attendance must have a valid calendar date. Dates are stored in
// Sessions.date and Imports.date; Attendance references the dated session_id.
function confirmationDate(iso){
  if(!dateValid(iso))return 'วันที่ไม่ถูกต้อง';
  return new Date(iso+'T12:00:00Z').toLocaleDateString('th-TH',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
}
function summaryDateBreakdown(rows){
  const byDay=new Map();
  for(const r of rows){
    const day=r.date;
    if(!dateValid(day))throw Error('พบรายการที่ไม่มีวันที่เรียนหรือวันที่ไม่ถูกต้อง กรุณากลับไปตรวจไฟล์และระบุวันที่ทุกคาบก่อนบันทึก');
    if(!byDay.has(day))byDay.set(day,{date:day,count:0,minutes:0,students:new Set()});
    const x=byDay.get(day);x.count++;x.minutes+=num(r.minutes);x.students.add(r.student);
  }
  return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function summaryRowsTable(rows){
  const running=new Map();
  return `<div class="table-wrap confirmation-table-wrap"><table class="summary-table confirmation-table"><thead><tr><th>วันที่เรียน</th><th>เวลา</th><th>นักเรียน / ไฟล์ต้นทาง</th><th>คลาส / คอร์ส</th><th>เวลาจริง</th><th>เวลาที่ตัด</th><th>คงเหลือก่อน → หลัง*</th></tr></thead><tbody>${rows.map(r=>{
    const before=Number.isFinite(r.before)?r.before:balance(r.courseId),prior=running.get(r.courseId)||0,after=before-prior-num(r.minutes);
    running.set(r.courseId,prior+num(r.minutes));
    return `<tr><td class="confirmation-date-cell"><time datetime="${esc(r.date)}"><strong>${esc(confirmationDate(r.date))}</strong><small>${esc(r.date)}</small>${r.dateSource?`<small>${esc(r.dateSource==='filename'?'จากชื่อไฟล์':r.dateSource==='excel'?'จาก Excel':r.dateSource==='manual'?'ระบุเอง':'ตรวจสอบวันที่')}</small>`:''}</time></td><td class="nowrap"><strong>${esc(r.timeRange||'—')}</strong></td><td><strong>${esc(r.student)}</strong><div class="td-secondary confirmation-file" title="${esc(r.source||'Manual')}">${esc(r.source||'Manual')}</div></td><td>${esc(r.course)}<div class="td-secondary">${esc(r.classLabel||'เรียนเดี่ยว')}</div></td><td>${esc(nice(r.actual))}</td><td><strong>${esc(nice(r.minutes))}</strong></td><td class="${after<0?'summary-negative':''}">${esc(nice(before-prior))} → ${after<0?'-':''}${esc(nice(Math.abs(after)))}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function showSaveSummary(title,kind,rows,onConfirm,details=''){
  if(!rows.length)throw Error('ไม่มีรายการที่จะบันทึก');
  const days=summaryDateBreakdown(rows);
  // Always confirm every imported calendar date. Do not silently substitute today's date.
  const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)||String(a.timeRange||'').localeCompare(String(b.timeRange||''))||String(a.student).localeCompare(String(b.student),'th'));
  const total=sorted.reduce((v,r)=>v+num(r.minutes),0),over=sorted.filter(r=>r.courseId&&balance(r.courseId)<num(r.minutes));
  const range=days.length===1?confirmationDate(days[0].date):`${confirmationDate(days[0].date)} – ${confirmationDate(days[days.length-1].date)}`;
  // Store the pending action only after validating all dates.
  pendingSummaryAction=onConfirm;
  modal('Review Summary · ตรวจสอบก่อนบันทึก',`<div class="summary-heading"><div class="eyebrow">FINAL CONFIRMATION</div><h3>${esc(title)}</h3><p class="helper">${esc(details)}</p></div>
    <div class="summary-date-range"><span>ช่วงวันที่เรียนที่กำลังบันทึก</span><strong>${esc(range)}</strong><small>ทุกแถวด้านล่างระบุวันที่เรียนและบันทึกเชื่อมกับคาบนั้นใน Google Sheets</small></div>
    <div class="summary-highlights summary-highlights-four"><div><small>วันเรียน (ไม่ซ้ำ)</small><strong>${days.length} วัน</strong></div><div><small>รายการที่จะบันทึก</small><strong>${sorted.length}</strong></div><div><small>ชั่วโมงที่เตรียมตัดเมื่ออนุมัติ</small><strong>${esc(nice(total))}</strong></div><div><small>การดำเนินการ</small><strong>${kind==='approve'?'อนุมัติตัดชั่วโมง':'บันทึก Pending'}</strong></div></div>
    <details class="confirmation-day-breakdown"><summary>ดูสรุปแยกตามวันที่ (${days.length} วัน)</summary><div class="confirmation-day-list">${days.map(x=>`<div><strong>${esc(confirmationDate(x.date))}</strong><span>${x.count} รายการ · ${x.students.size} นักเรียน · ${esc(nice(x.minutes))} เตรียมตัด</span></div>`).join('')}</div></details>
    ${summaryRowsTable(sorted)}<div class="note mt12">* ยอดหลังเป็นยอดคาดการณ์ <strong>เมื่ออนุมัติตัดชั่วโมง</strong> หากกำลังสร้าง Pending ยอดจริงจะยังไม่เปลี่ยน วันที่เรียนจะถูกบันทึกกับทุกคาบ แม้บันทึกหลายไฟล์พร้อมกัน</div>
    ${over.length?'<div class="note warn mt12">บางรายการมีชั่วโมงไม่พอหรือควรตรวจสอบก่อนอนุมัติ</div>':''}
    <label class="summary-agree"><input type="checkbox" id="summary-ack"> <span>ตรวจสอบ<strong>วันที่เรียนของทุกคาบ</strong> เวลา นักเรียน คลาส แพ็กเกจ และชั่วโมงแล้ว ยืนยันว่าข้อมูลถูกต้อง</span></label>
    <div class="button-row mt20"><button type="button" class="btn" data-action="summary-back">← กลับไปแก้ไข</button><button type="button" class="btn primary" data-action="summary-confirm" id="summary-confirm-btn" disabled>${kind==='approve'?'ยืนยันอนุมัติและตัดชั่วโมง':'ยืนยันบันทึกเป็น Pending พร้อมวันที่เรียน'}</button></div>`, '',true);
}
async function confirmSaveSummary(){
  if(!$('#summary-ack')?.checked)throw Error('กรุณาติ๊กยืนยันว่าตรวจสอบข้อมูลแล้ว');
  if(!pendingSummaryAction)throw Error('ไม่พบรายการยืนยัน กรุณาเปิดหน้าสรุปใหม่');
  const action=pendingSummaryAction;pendingSummaryAction=null;
  try{await action();closeModal();}catch(e){pendingSummaryAction=action;throw e;}
}
function previewManual(f){
  const date=inputVal(f,'class_date'),start=inputVal(f,'class_start'),end=inputVal(f,'class_end'),dur=duration(start,end),groupId=inputVal(f,'group_id');
  if(!dateValid(date)||!Number.isFinite(dur)||dur<=0||dur>720)throw Error('กรุณาตรวจสอบวันที่และเวลาเรียน');
  const basis=inputVal(f,'deduction_mode'),value=basis==='custom'?Number(inputVal(f,'class_custom')):adjustedByRule(dur,ruleFor('group',groupId));
  if(!Number.isInteger(value)||value<0||value>720)throw Error('เวลาตัดชั่วโมงไม่ถูกต้อง');
  const ids=[...f.querySelectorAll('input[name=participant]:checked')].map(el=>el.value);if(!ids.length)throw Error('กรุณาเลือกนักเรียน');
  const rows=ids.map(id=>{const courseId=f.querySelector(`select.manual-course[data-student="${CSS.escape(id)}"]`)?.value,course=byId('Courses',courseId);
    if(!course||course.student_id!==id||!['active','held'].includes(course.status))throw Error('คอร์สไม่ถูกต้องสำหรับ '+studentName(id));
    const raw=f.querySelector(`input.manual-minute[data-student="${CSS.escape(id)}"]`)?.value;
    const minutes=raw===''||raw===undefined?value:Number(raw);if(!Number.isInteger(minutes)||minutes<0||minutes>720)throw Error('จำนวนนาทีไม่ถูกต้อง: '+studentName(id));
    return {student:studentName(id),source:'Manual · '+start+'–'+end,course:courseTitle(courseId),courseId,classLabel:groupId?byId('Groups',groupId)?.name||'เรียนกลุ่ม':'เรียนเดี่ยว',minutes,actual:dur,date,dateSource:'manual',timeRange:start+'–'+end};
  });
  showSaveSummary('บันทึกคาบเรียนด้วยตนเอง','pending',rows,()=>saveManual(f),'คาบนี้จะบันทึกเป็น Pending และยังไม่ตัดชั่วโมงจนกว่าจะอนุมัติ');
}
function importRowsForSummary(d){
  const selected=d.people.filter((p,i)=>i!==d.tutorIndex&&p.include);
  if(!selected.length)throw Error('เลือกผู้เรียนอย่างน้อย 1 รายการก่อนบันทึก');
  return selected.map(p=>{if(!p.studentId)throw Error('ชื่อ Meet '+p.name+' ยังไม่ได้จับคู่นักเรียน');
    const gid=d.split?(p.classChoice==='private'?'':p.classChoice):d.classType==='group'?d.groupId:'';
    const minutes=p.manualMinutes===null?adjustedByRule(calculatedImport(d,p),ruleFor('group',gid)):Number(p.manualMinutes);
    if(!Number.isInteger(minutes)||minutes<0||minutes>720)throw Error('ตรวจสอบนาทีของ '+p.name);
    const c=byId('Courses',p.courseId);if(!c||c.student_id!==p.studentId)throw Error('เลือกคอร์สให้ '+p.name+' ก่อน');
    return {student:studentName(p.studentId),source:d.filename+' · Meet: '+p.name,course:courseTitle(c.id),courseId:c.id,classLabel:gid?byId('Groups',gid)?.name||'เรียนกลุ่ม':'เรียนเดี่ยว',minutes,actual:p.actual,date:d.date,dateSource:d.dateSource,timeRange:reportClock(d).start+'–'+reportClock(d).end};
  });
}
function previewImportSave(){const d=state.importDraft;if(!d)throw Error('ยังไม่ได้เลือก Excel');
  if(state.importDone[state.importIndex])throw Error('ไฟล์นี้ดำเนินการแล้ว');
  constructImportBatch([state.importIndex]);
  const rows=importRowsForSummary(d);
  showSaveSummary('ยืนยันบันทึกรายงาน Google Meet','pending',rows,()=>saveImport(),'ชื่อที่จดจำไว้จะผูกกับ Student ID เมื่อกดบันทึก และรายการจะอยู่ในสถานะ Pending');
}
function buildApproval(ids){
  const unique=[...new Set(ids)],sessions=[],aa=[],totals=new Map();if(!unique.length)throw Error('กรุณาเลือกคาบเรียนที่ต้องการอนุมัติ');
  for(const id of unique){const s=byId('Sessions',id);if(!s||s.status!=='pending')throw Error('คาบที่เลือกไม่ได้อยู่ในสถานะรออนุมัติ กรุณารีเฟรชก่อน');
    if(!dateValid(s.date))throw Error('คาบที่เลือกยังไม่มีวันที่เรียนที่ถูกต้อง จึงไม่สามารถอนุมัติได้: '+(s.source_file||id));
    const at=all('Attendance').filter(a=>a.session_id===id);if(!at.length)throw Error('คาบ '+s.date+' ไม่มีผู้เรียน');sessions.push(s);
    for(const a of at){if(byId('Students',a.student_id)?.status!=='active')throw Error('นักเรียนไม่พร้อมใช้งาน: '+studentName(a.student_id));
      const c=byId('Courses',a.course_id);if(!c||!['active','held'].includes(c.status)||c.student_id!==a.student_id)throw Error('คอร์สไม่เปิดใช้งาน: '+studentName(a.student_id));
      const minutes=Number(a.deduct_minutes);if(!Number.isInteger(minutes)||minutes<0||minutes>720)throw Error('ชั่วโมงผิดปกติ: '+studentName(a.student_id));
      totals.set(a.course_id,(totals.get(a.course_id)||0)+minutes);aa.push(a);
    }
  }
  for(const [cid,required] of totals){if(balance(cid)<required)throw Error('ชั่วโมงของ '+studentName(byId('Courses',cid)?.student_id)+' ไม่พอ ต้องใช้ '+nice(required)+' เหลือ '+nice(balance(cid)));}
  return {sessions,aa};
}
function previewApproval(ids){
  const {sessions,aa}=buildApproval(ids),sessionMap=new Map(sessions.map(s=>[s.id,s]));
  const rows=aa.map(a=>{const s=sessionMap.get(a.session_id);return {student:studentName(a.student_id),source:s.source_file||'Manual',date:s.date,course:courseTitle(a.course_id),courseId:a.course_id,classLabel:s.group_id?byId('Groups',s.group_id)?.name||'เรียนกลุ่ม':'เรียนเดี่ยว',actual:a.actual_minutes,minutes:a.deduct_minutes,timeRange:s.start_time+'–'+s.end_time};});
  showSaveSummary('อนุมัติ '+sessions.length+' คาบเรียน','approve',rows,()=>approveSessions(sessions.map(s=>s.id)),'กดยืนยันแล้วจะตัดชั่วโมงจริงจากแพ็กเกจที่แสดง และบันทึกประวัติใน Hour Ledger');
}

function init(){store=new DemoStore();const back=document.createElement('div');back.className='mobile-backdrop';back.id='mobile-backdrop';document.body.appendChild(back);document.addEventListener('click',onClick);document.addEventListener('submit',onSubmit);document.addEventListener('change',onChange);document.addEventListener('input',onInput);document.addEventListener('dragenter',onFileDrag);document.addEventListener('dragover',onFileDrag);document.addEventListener('dragleave',onFileDrag);document.addEventListener('drop',onFileDrag);$('#menu-toggle').onclick=()=>toggleMenu(true);back.onclick=()=>toggleMenu(false);$('#refresh-btn').onclick=()=>{if(state.mode==='needs_login'){googleLogin();return;}if(state.mode==='setup_required'){openConnection();return;}reload().then(()=>toast('อัปเดตข้อมูลแล้ว')).catch(notice);};$('#connect-side').onclick=openConnection;$('#account-btn').onclick=openConnection;if(liveConfigured){state.mode='needs_login';render();restoreGoogleSession().catch(notice);}else{state.mode='setup_required';render();}}
function toggleMenu(show){$('#sidebar').classList.toggle('open',show);$('#mobile-backdrop').classList.toggle('open',show);}
function render(){const v=state.view;document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===v));$('#crumb').textContent=v.toUpperCase();$('#mode-pill').textContent=state.mode==='live'?'GOOGLE SHEETS':state.mode==='needs_login'?'CONNECT GOOGLE':state.mode==='setup_required'?'SETUP GOOGLE':'DEMO DATA';$('#side-mode').textContent=state.mode==='live'?'LIVE DATABASE':state.mode==='needs_login'?'GOOGLE SIGN-IN REQUIRED':state.mode==='setup_required'?'GOOGLE SETUP REQUIRED':'DEMO MODE';$('#account-btn').textContent=state.mode==='live'?'G':'S';const views={dashboard,students,groups,schedule,manual,import:importPage,reviews,history:learningHistory,reports};$('#app').innerHTML=['needs_login','setup_required'].includes(state.mode)?connectionGate():(views[v]||dashboard)();}
function go(view){state.view=view;toggleMenu(false);render();window.scrollTo(0,0);}
const activeStudents=()=>all('Students').filter(s=>s.status==='active');
const sessionsSorted=()=>[...all('Sessions')].sort((a,b)=>(b.date+' '+b.start_time).localeCompare(a.date+' '+a.start_time));
function dashboard(){const active=activeStudents(),pending=all('Sessions').filter(s=>s.status==='pending'),approved=all('Sessions').filter(s=>s.status==='approved');const rem=active.reduce((n,s)=>n+currentStudentTotal(s.id),0);const usedThisMonth=approved.filter(s=>s.date?.slice(0,7)===dateNow().slice(0,7)).reduce((n,s)=>n+duration(s.start_time,s.end_time),0);return `${head('OVERVIEW / LEARNING HOURS','Tutor Dashboard','บริหารชั่วโมงเรียน นักเรียน และคาบเรียนจากที่เดียว',`<div class="button-row">${btn('＋ เพิ่มนักเรียน','add-student','soft')}${btn('＋ บันทึกเวลาเรียน','go-manual','primary')}</div>`)}
<div class="stats"><div class="stat"><div class="mini">Active Students</div><div class="big">${active.length}</div><div class="foot">นักเรียนที่กำลังเรียน</div></div><div class="stat"><div class="mini">Remaining Hours</div><div class="big">${fmt(rem)}</div><div class="foot">รวมยอดของคอร์สที่ใช้งาน</div></div><div class="stat"><div class="mini">Pending Reviews</div><div class="big">${pending.length}</div><div class="foot">รออนุมัติก่อนตัดชั่วโมง</div></div><div class="stat"><div class="mini">Teaching This Month</div><div class="big">${fmt(usedThisMonth)}</div><div class="foot">รวมระยะเวลาคาบเรียนที่อนุมัติ</div></div></div>
<div class="two-col"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Recent Sessions</h2><p class="panel-desc">รายการล่าสุดและสถานะอนุมัติ</p></div>${btn('View all →','go-reviews','small')}</div>${sessionsSorted().slice(0,5).map(s=>`<div class="list-row"><div class="person"><div class="avatar">◷</div><div><strong>${esc(s.date)} · ${esc(s.start_time)}–${esc(s.end_time)}</strong><small>${esc(s.mode==='excel'?'Excel Import':'Manual Entry')} · ${all('Attendance').filter(a=>a.session_id===s.id).length} คน</small></div></div><div>${pill(s.status,s.status==='approved'?'green':s.status==='pending'?'gold':'')}</div></div>`).join('')||'<div class="empty">ยังไม่มีคาบเรียน</div>'}</section>
<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Low Hour Balances</h2><p class="panel-desc">คอร์สที่เหลือไม่เกิน 2 ชั่วโมง</p></div></div>${all('Courses').filter(c=>c.status==='active'&&balance(c.id)<=120).slice(0,6).map(c=>`<div class="list-row"><div><strong style="font-size:12px">${esc(studentName(c.student_id))}</strong><div class="td-secondary">${esc(c.title)}</div></div><strong class="${balance(c.id)<=0?'error-text':'amount'}">${fmt(balance(c.id))}</strong></div>`).join('')||'<div class="empty">ยังไม่มีคอร์สใกล้หมด</div>'}</section></div>
<div class="panel"><div class="panel-head"><div><h2 class="panel-title">Quick Actions</h2><p class="panel-desc">เริ่มงานที่ใช้งานบ่อย</p></div></div><div class="button-row">${btn('⇧ Upload Meet Excel','go-import','soft')}${btn('☑ Approve Attendance','go-reviews')}${btn('♙ Manage Students','go-students')}${btn('⚙ Connect Google Sheets','connection')}</div></div>${state.mode!=='live'?'<div class="note warn">ขณะนี้เป็นข้อมูลตัวอย่างในเบราว์เซอร์ ยังไม่เชื่อม Google Sheets — ไปที่ Connection settings เพื่อตั้งค่าใช้งานจริง</div>':''}`;}
function studentCard(s){
  const current=liveCourses(s.id),rem=currentStudentTotal(s.id),purchased=current.reduce((n,c)=>n+num(c.purchased_minutes),0),ratio=purchased>0?Math.max(0,Math.min(100,Math.round(rem/purchased*100))):0;
  const initial=(s.name||'?').trim().slice(0,1).toUpperCase();
  const meetCount=activeAliasRows().filter(a=>a.student_id===s.id).length;
  const low=current.length>0&&rem<=120;
  return `<article class="student-card"><div class="student-card-head"><div class="student-avatar">${esc(initial)}</div><div class="student-title"><button class="student-name link-btn" data-action="student-detail" data-id="${esc(s.id)}">${esc(s.name)}</button><span class="student-fullname">${esc(s.full_name||'ยังไม่ระบุชื่อ–นามสกุล')}</span><small>${esc(s.id.slice(0,12))}</small></div>${pill(s.status==='deleted'?'ถังขยะ':s.status==='archived'?'พักเรียน':'กำลังเรียน',s.status==='active'?'green':s.status==='deleted'?'red':'')}</div>
  <div class="student-education"><div>⌂ <span>${esc(s.school||'ยังไม่ระบุโรงเรียน')}</span></div><small>ระดับชั้น ${esc(s.grade_level||'ยังไม่ระบุ')}${s.academic_year?' · ปี '+esc(s.academic_year):''}</small></div>
  <div class="student-balance"><div class="flex-between"><span>ชั่วโมงคงเหลือ</span><strong class="${low?'balance-low':'balance-good'}">${esc(nice(rem))}</strong></div><div class="progress" role="progressbar" aria-valuenow="${ratio}" aria-valuemin="0" aria-valuemax="100" aria-label="สัดส่วนชั่วโมงคงเหลือ"><div class="progress-fill ${low?'low':''}" style="width:${ratio}%"></div></div><small>${current.length} คอร์สที่ใช้งาน${low?' · ชั่วโมงใกล้หมด':''}</small></div>
  <div class="student-course-chips">${current.slice(0,2).map(c=>`<span class="student-chip">${esc(c.title)}</span>`).join('')||'<span class="student-chip quiet">ยังไม่มีคอร์ส</span>'}${current.length>2?`<span class="student-chip">+${current.length-2}</span>`:''}</div>
  <div class="student-card-foot"><span>⌁ Meet: ${meetCount} ชื่อ</span><span>♧ ${groupsOfStudent(s.id).length} กลุ่ม</span></div>
  <div class="student-actions">${s.status==='deleted'?btnInline('♻ กู้คืน','restore-student',s.id):`${btnInline('ดูข้อมูล','student-detail',s.id)} ${btnInline('✎ แก้ไข','edit-student',s.id)} ${current.length?btnInline('↻ ต่อคอร์ส','renew-student',s.id):''}`}</div></article>`;
}
function students(){
  const deleted=all('Students').filter(s=>s.status==='deleted');
  const grades=[...new Set(all('Students').map(s=>s.grade_level).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
  const ss=all('Students').filter(s=>{
    if(state.showDeleted?s.status!=='deleted':s.status==='deleted')return false;
    if(state.studentGradeFilter!=='all'&&s.grade_level!==state.studentGradeFilter)return false;
    if(state.studentStatusFilter!=='all'&&s.status!==state.studentStatusFilter)return false;
    return norm([s.name,s.full_name,s.school,s.grade_level,s.email,s.aliases].join(' ')).includes(norm(state.search));
  }).sort((a,b)=>a.name.localeCompare(b.name,'th'));
  const actions=`<div class="button-row">${btn('＋ สร้างคอร์ส','add-course','soft')}${btn('＋ เพิ่มนักเรียน','add-student','primary')}</div>`;
  return `${head('PEOPLE / ENROLLMENT','Students & Courses','ข้อมูลนักเรียน โรงเรียน ระดับชั้น ชั่วโมงคงเหลือ และประวัติคอร์ส',actions)}
  <section class="panel"><div class="student-toolbar"><input class="search" id="student-search" placeholder="ค้นหาชื่อ โรงเรียน หรือระดับชั้น…" aria-label="ค้นหานักเรียน" value="${esc(state.search)}"><select id="student-grade-filter" aria-label="กรองระดับชั้น"><option value="all">ทุกระดับชั้น</option>${grades.map(g=>`<option value="${esc(g)}" ${state.studentGradeFilter===g?'selected':''}>${esc(g)}</option>`).join('')}</select><select id="student-status-filter" aria-label="กรองสถานะ"><option value="all">ทุกสถานะ</option><option value="active" ${state.studentStatusFilter==='active'?'selected':''}>กำลังเรียน</option><option value="archived" ${state.studentStatusFilter==='archived'?'selected':''}>พักเรียน</option></select><div class="student-layout-toggle" aria-label="มุมมองรายชื่อนักเรียน"><button type="button" class="${state.studentLayout==='cards'?'selected':''}" data-action="student-view-cards" aria-pressed="${state.studentLayout==='cards'}">▦ การ์ด</button><button type="button" class="${state.studentLayout==='table'?'selected':''}" data-action="student-view-table" aria-pressed="${state.studentLayout==='table'}">☰ ตาราง</button></div><button class="btn small ${state.showDeleted?'soft':''}" data-action="toggle-deleted">${state.showDeleted?'← กลับรายการ':`♻ ถังขยะ (${deleted.length})`}</button></div>
  <p class="helper">แสดง ${ss.length} นักเรียน · แตะการ์ดเพื่อดูคอร์สและประวัติ หรือกดแก้ไขเพื่อเปลี่ยนโรงเรียน/ระดับชั้น</p>
  ${state.showDeleted?'<div class="note warn mt12">รายการในถังขยะถูกซ่อนจากการลงเวลาและ Google Meet แต่ข้อมูลเก่ายังคงอยู่</div>':''}
  ${state.studentLayout==='cards'?`<div class="student-cards">${ss.map(studentCard).join('')||'<div class="empty">ไม่พบนักเรียนตามเงื่อนไข</div>'}</div>`:`<div class="table-wrap mt20"><table><thead><tr><th>นักเรียน</th><th>โรงเรียน / ชั้น</th><th>คอร์ส</th><th>คงเหลือ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${ss.map(s=>`<tr><td><button class="link-btn" data-action="student-detail" data-id="${esc(s.id)}">${esc(s.name)}</button><div class="td-secondary">${esc(s.full_name||'')}</div></td><td>${esc(s.school||'-')}<div class="td-secondary">${esc(s.grade_level||'-')}</div></td><td>${liveCourses(s.id).length}</td><td><strong class="amount">${esc(nice(currentStudentTotal(s.id)))}</strong></td><td>${pill(s.status,s.status==='active'?'green':'')}</td><td><div class="button-row">${btnInline('โปรไฟล์','student-detail',s.id)} ${s.status==='deleted'?btnInline('กู้คืน','restore-student',s.id):btnInline('แก้ไข','edit-student',s.id)}</div></td></tr>`).join('')||'<tr><td colspan="6" class="empty">ไม่พบนักเรียน</td></tr>'}</tbody></table></div>`}</section>${state.studentId?studentDetail(state.studentId)+studentEducationHistory(state.studentId):''}`;
}
function studentEducationHistory(id){const items=all('StudentEducationHistory').filter(h=>h.student_id===id).sort((a,b)=>String(b.changed_at).localeCompare(String(a.changed_at)));if(!items.length)return '';return `<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Academic History</h2><p class="panel-desc">ประวัติการเปลี่ยนโรงเรียนและระดับชั้น · ${items.length} ครั้ง</p></div></div><div class="timeline">${items.map(h=>`<div class="timeline-item"><strong>${esc(h.old_school||'ไม่ระบุ')} (${esc(h.old_grade_level||'-')}) → ${esc(h.new_school||'ไม่ระบุ')} (${esc(h.new_grade_level||'-')})</strong><small>${esc(h.changed_at)} · ปีการศึกษา ${esc(h.old_academic_year||'-')} → ${esc(h.new_academic_year||'-')}</small></div>`).join('')}</div></section>`;}
const btnInline=(label,action,id)=>`<button class="btn small" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
function studentDetail(id){const s=byId('Students',id);if(!s)return '';const cs=coursesOf(id);const shown=state.showArchive?cs:cs.filter(c=>c.status==='active');const history=all('Attendance').filter(a=>a.student_id===id).sort((a,b)=>(byId('Sessions',b.session_id)?.date||'').localeCompare(byId('Sessions',a.session_id)?.date||''));return `<section class="panel" id="profile"><div class="panel-head"><div><h2 class="panel-title">${esc(s.name)} · Student Profile</h2><p class="panel-desc">${esc(s.full_name||'')} · ${esc(s.school||'โรงเรียนไม่ระบุ')} · ${esc(s.grade_level||'ระดับชั้นไม่ระบุ')} ${s.academic_year?'· ปี '+esc(s.academic_year):''}</p><p class="helper">${esc(s.notes||'Course wallet & learning history')}</p></div><div class="button-row">${s.status==='deleted'?btnInline('กู้คืนนักเรียน','restore-student',id):`${btnInline('แก้ไขนักเรียน','edit-student',id)} ${btnInline('＋ คอร์สใหม่','new-course-for',id)} <button class="btn small danger" data-action="delete-student" data-id="${esc(id)}">ลบนักเรียน</button>`} <button class="btn small" data-action="hide-student">ปิด</button></div></div><div class="metric-strip"><div><small>Active courses</small><b>${liveCourses(id).length}</b></div><div><small>Available balance</small><b>${fmt(currentStudentTotal(id))}</b></div><div><small>Past course cycles</small><b>${cs.filter(c=>c.status==='archived').length}</b></div></div><div class="panel-head mt20"><h3 class="panel-title">Course Cycles</h3><button class="link-btn" data-action="toggle-archive">${state.showArchive?'ซ่อนประวัติเก่า':'ดูประวัติคอร์สเก่า →'}</button></div><div class="cards-grid">${shown.map(c=>`<div class="sheet-card"><div class="flex-between"><strong>${esc(c.title)}</strong>${pill(c.status,c.status==='active'?'green':'')}</div><p class="mini">รอบที่ ${esc(c.cycle_no)} · เริ่ม ${esc(c.start_date)}</p><div class="big">${fmt(balance(c.id))}</div><div class="mini">ชั่วโมงคงเหลือ · ลงทะเบียน ${fmt(c.purchased_minutes)} ชั่วโมง</div><div class="button-row mt12">${c.status==='active'&&s.status!=='deleted'?`${btnInline('ต่อคอร์ส','renew-course',c.id)} ${btnInline('เติมชั่วโมง','topup-course',c.id)} ${btnInline('ปรับยอด','adjust-course',c.id)}`:''}${btnInline('รายละเอียด','course-history',c.id)} ${btnInline('เงื่อนไขคอร์ส','course-policy',c.id)}${coursePolicy(c.id)?.expires_on?`<span class="mini">หมดอายุ ${esc(coursePolicy(c.id).expires_on)}</span>`:''}</div></div>`).join('')||'<div class="empty">ยังไม่มีคอร์สที่แสดง</div>'}</div><div class="panel-head mt20"><h3 class="panel-title">Recent Attendance</h3></div><div class="table-wrap"><table><thead><tr><th>DATE</th><th>COURSE</th><th>ACTUAL</th><th>DEDUCTED</th><th>STATUS</th></tr></thead><tbody>${history.slice(0,12).map(a=>`<tr><td>${esc(byId('Sessions',a.session_id)?.date||'-')}</td><td>${esc(courseTitle(a.course_id))}</td><td>${fmt(a.actual_minutes)}</td><td>${fmt(a.deduct_minutes)}</td><td>${pill(a.status,a.status==='approved'?'green':'gold')}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">ไม่มีประวัติการเรียน</td></tr>'}</tbody></table></div>${aliasPanel(id)}</section>`;}
function aliasPanel(studentId){const rows=all('MeetAliases').filter(x=>x.student_id===studentId&&x.status==='active');return `<div class="panel-head mt20"><h3 class="panel-title">Google Meet Identities</h3>${btnInline('＋ เพิ่มชื่อ Meet','add-meet-alias',studentId)}</div><div class="alias-list">${rows.map(a=>`<div class="alias-card"><span><strong>${esc(a.meet_name||'(ไม่มีชื่อ)')}</strong><small>${esc(a.email||'')} · ยืนยัน ${esc(a.verified_at?.slice(0,10)||'')}</small></span>${btnInline('ยกเลิกการจดจำ','remove-meet-alias',a.id)}</div>`).join('')||'<p class="helper">ยังไม่มีชื่อ Meet ที่ยืนยัน (ชื่อในข้อมูลนักเรียนเดิมยังสามารถใช้จับคู่ได้)</p>'}</div>`;}
function openAliasForm(studentId){const s=byId('Students',studentId);if(!s||s.status!=='active')return;modal('จดจำชื่อ Google Meet · '+s.name,`<form id="alias-form" class="form"><input type="hidden" name="alias-student" value="${esc(studentId)}">${field('alias-name','ชื่อที่ปรากฏใน Google Meet','text','','required')}${field('alias-email','อีเมล Meet (ถ้ามี)','email','','')}<div class="note">หากชื่อหรืออีเมลนี้เชื่อมกับนักเรียนคนอื่น ระบบจะไม่อนุญาตให้บันทึกจนกว่าจะแก้ไขความขัดแย้ง</div><button class="btn primary" type="submit">ยืนยันและจดจำชื่อนี้</button></form>`);}
async function saveAlias(f){const id=inputVal(f,'alias-student'),name=inputVal(f,'alias-name'),email=inputVal(f,'alias-email');if(!byId('Students',id)||!name)throw Error('กรุณาเลือกนักเรียนและชื่อ Meet');const conflict=aliasConflict(name,email,id);if(conflict)throw Error('ชื่อหรืออีเมลนี้สัมพันธ์กับ '+conflict+' กรุณาตรวจสอบก่อน');if(aliasExists(name,email,id))throw Error('ชื่อ Meet นี้เคยบันทึกไว้แล้ว');await commit({add:{MeetAliases:[aliasRow(id,name,email)],Audit:[saveAudit('meet_alias_verified',id,{name,email})]}});closeModal();toast('บันทึกชื่อ Meet สำหรับการจับคู่ครั้งต่อไปแล้ว');}
async function removeAlias(id){const a=byId('MeetAliases',id);if(!a||a.status!=='active')return;if(!confirm('ยกเลิกการจดจำชื่อ Meet นี้? รายงานเก่าจะยังอยู่'))return;await commit({update:{MeetAliases:[{...a,status:'inactive'}]},add:{Audit:[saveAudit('meet_alias_unlinked',a.student_id,{name:a.meet_name})]}});toast('ยกเลิกการจดจำชื่อ Meet แล้ว');}
function groups(){return `${head('GROUP LEARNING / MEMBERS','Class Groups','นักเรียนหนึ่งคนมีได้ทั้งคอร์สเดี่ยวและหลายกลุ่ม พร้อมเก็บประวัติสมาชิก',btn('＋ สร้างกลุ่มเรียน','add-group','primary'))}
  <div class="note">การเพิ่มหรือย้ายสมาชิกไม่เปลี่ยนประวัติคาบเรียนเก่า · กำหนดเวลาอ้างอิงเริ่มต้นเฉพาะกลุ่มได้</div>
  <div class="cards-grid mt20">${all('Groups').map(g=>{const ids=membersOf(g.id),r=ruleFor('group',g.id);return `<div class="sheet-card"><div class="flex-between"><strong>${esc(g.name)}</strong>${pill(ids.length+' students','green')}</div><div class="mini" style="line-height:1.8">${ids.map(studentName).map(esc).join(' · ')||'ยังไม่มีสมาชิก'}</div><div class="mini mt12">กติกาตัดชั่วโมง: ${esc(r?.basis||'tutor')} · บันทึกสมาชิก ${all('GroupMemberships').filter(x=>x.group_id===g.id).length} เหตุการณ์</div><div class="button-row mt20">${btnInline('แก้ไขสมาชิก','edit-group',g.id)} ${btnInline('ประวัติสมาชิก','group-members',g.id)} ${btnInline('กติกาเริ่มต้น','group-rule',g.id)} ${btnInline('ลงเวลาเรียน','record-group',g.id)}</div></div>`}).join('')||'<div class="empty">ยังไม่มีกลุ่มเรียน เพิ่มกลุ่มเพื่อเริ่มต้น</div>'}</div>`;}

function manual(){const g=all('Groups');return `${head('ATTENDANCE / MANUAL','Record Hours','บันทึกเวลาเริ่ม–สิ้นสุด เลือกสมาชิกและคอร์ส ก่อนส่งรายการตรวจสอบ',btn('⇧ Import Excel','go-import','soft'))}<div class="panel"><form id="manual-form" class="form"><div class="grid-3">${field('class_date','วันที่เรียน','date',dateNow(),'required')}${field('class_start','เวลาเริ่ม','time','18:00','required')}${field('class_end','เวลาสิ้นสุด','time','20:00','required')}</div><div class="grid-2">${selectField('group_id','กลุ่มเรียน (ไม่บังคับ)',`<option value="">รายบุคคล / เลือกเอง</option>${g.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}`)}${field('tutor','ชื่อติวเตอร์','text','Suthawarin','required')}</div><div class="grid-2">${selectField('deduction_mode','วิธีตัดชั่วโมง',`<option value="full">ใช้เวลาติวเตอร์ / เวลาที่กรอก</option><option value="custom">กำหนดนาทีที่จะตัดเอง</option>`)}${field('class_custom','ตัดชั่วโมง (นาที เมื่อเลือก Custom)','number','120','min="0" max="1440"')}</div><div class="field"><label>เลือกผู้เข้าร่วมและคอร์สที่จะตัด</label><div class="note">นักเรียนที่ไม่ถูกติ๊กจะไม่ถูกลง Attendance และไม่ถูกตัดชั่วโมง</div></div><div id="manual-students">${manualStudents()}</div><div class="field"><label>หมายเหตุ</label><textarea name="class_notes" rows="2" placeholder="หัวข้อที่เรียน / บันทึกเพิ่มเติม"></textarea></div><div class="button-row"><button class="btn primary" type="submit">บันทึกรอตรวจสอบ →</button><span class="helper">ยังไม่ตัดชั่วโมงจนกว่าจะกด Approve ในหน้า Review</span></div></form></div>`;}
function manualStudents(groupId=''){const group=byId('Groups',groupId),members=(group?.member_ids||'').split('|').filter(Boolean);return `<div class="table-wrap"><table><thead><tr><th>SELECT</th><th>STUDENT</th><th>COURSE TO DEDUCT</th><th>AVAILABLE</th><th>OVERRIDE (MIN)</th></tr></thead><tbody>${all('Students').filter(s=>s.status==='active').map(s=>{const cs=liveCourses(s.id);return `<tr><td><input type="checkbox" name="participant" class="manual-check" value="${esc(s.id)}" ${members.includes(s.id)?'checked':''} ${cs.length?'':'disabled'}></td><td>${esc(s.name)}</td><td><select class="manual-course" data-student="${esc(s.id)}" style="width:100%;border:1px solid #e3e9e2;border-radius:7px;padding:8px">${courseOptions(s.id,cs[0]?.id)}</select></td><td>${fmt(currentStudentTotal(s.id))}</td><td><input type="number" class="manual-minute" data-student="${esc(s.id)}" min="0" max="720" step="1" placeholder="auto" style="width:83px;border:1px solid #e3e9e2;border-radius:7px;padding:8px"></td></tr>`}).join('')||'<tr><td colspan="4" class="empty">ยังไม่มีนักเรียนหรือคอร์ส</td></tr>'}</tbody></table></div>`;}
function batchStatus(index){
  const d=state.importDrafts[index],error=state.importErrors[index],done=state.importDone[index];
  if(done==='saved')return {label:'บันทึกแล้ว',tone:'green'};
  if(done==='skipped')return {label:'ข้าม',tone:''};
  if(error)return {label:'อ่านไม่สำเร็จ',tone:'red'};
  if(!d)return {label:'กำลังอ่าน',tone:'blue'};
  if(all('Imports').some(x=>x.fingerprint===d.fingerprint)||state.importDrafts.some((other,i)=>i<index&&other?.fingerprint===d.fingerprint))return {label:'ไฟล์ซ้ำ',tone:'red'};
  const diff=d.people.filter((p,i)=>i!==d.tutorIndex&&getPersonStatus(d,p).level!=='match').length;
  if(!dateValid(d.date)||d.dateConflict)return {label:'ตรวจวันที่',tone:'gold'};return diff?{label:`ตรวจชื่อ ${diff} คน`,tone:'gold'}:{label:'จับคู่ครบ',tone:'green'};
}
function personKey(p){return p.studentId?`s:${p.studentId}`:p.email?`e:${norm(p.email)}`:`n:${norm(p.name)}`;}
function getPersonStatus(d,p){
  if(!p.studentId)return p.matchLevel==='conflict'?{level:'conflict',text:'ตัวตนขัดแย้ง',note:p.matchReason}:{level:'unknown',text:'ยังไม่จับคู่นักเรียน',note:p.matchReason||'ชื่อในรายงานยังไม่ตรงกับฐานข้อมูล ต้องตรวจสอบก่อนเลือกตัดชั่วโมง'};
  const others=state.importDrafts.filter(x=>x&&x!==d);
  if(!others.length)return {level:'match',text:'จับคู่แล้ว',note:''};
  const key=personKey(p);
  const counterparts=others.flatMap(x=>x.people.filter((other,i)=>i!==x.tutorIndex&&personKey(other)===key));
  if(!counterparts.length)return {level:'different',text:'ไม่พบในบางไฟล์',note:'นักเรียนคนนี้ไม่มีในรายงานอีกไฟล์ อาจเป็นคนละคาบ โปรดตรวจสอบ'};
  const otherNames=[...new Set(counterparts.map(other=>other.name).filter(name=>norm(name)!==norm(p.name)))];
  if(otherNames.length)return {level:'different',text:'ชื่อ Meet ไม่ตรงกัน',note:'รายงานอื่น: '+otherNames.join(' / ')};
  if(counterparts.length<others.length)return {level:'different',text:'ไม่พบในบางไฟล์',note:'พบชื่อนี้เพียงบางไฟล์ โปรดตรวจสอบ'};
  return {level:'match',text:'ตรงกันทุกไฟล์',note:''};
}

function importBulkTargets(){return state.bulkScope==='batch'?state.importDrafts.filter(Boolean).filter(d=>!state.importDone[state.importDrafts.indexOf(d)]):state.importDraft?[state.importDraft]:[];}
function importBulkPanel(){
  const targets=importBulkTargets(),students=targets.flatMap(d=>d.people.filter((p,i)=>i!==d.tutorIndex)),selected=students.filter(p=>p.include);
  const groups=all('Groups');
  return `<section class="panel bulk-panel"><div class="panel-head"><div><h2 class="panel-title">Bulk Actions · ตั้งค่าหลายรายการพร้อมกัน</h2><p class="panel-desc">เลือกรายชื่อและกำหนดค่าได้พร้อมกัน ก่อนเปิดหน้าสรุปเพื่อบันทึก Pending</p></div>${pill('เลือก '+selected.length+'/'+students.length+' รายการ','green')}</div>
    <div class="bulk-select-row"><div class="field"><label for="bulk-scope">ขอบเขตการเลือก</label><select id="bulk-scope"><option value="current" ${state.bulkScope==='current'?'selected':''}>ไฟล์ที่กำลังเปิด</option><option value="batch" ${state.bulkScope==='batch'?'selected':''}>ทุกไฟล์ในชุดที่ยังไม่บันทึก</option></select></div><div class="button-row"><button type="button" class="btn small soft" data-action="bulk-select-all">☑ เลือกทั้งหมด</button><button type="button" class="btn small soft" data-action="bulk-select-matched">✓ เฉพาะที่จับคู่แล้ว</button><button type="button" class="btn small" data-action="bulk-select-none">ไม่เลือกทั้งหมด</button></div></div>
    <div class="grid-3 mt12"><div class="field"><label for="bulk-class">ประเภทคลาส</label><select id="bulk-class"><option value="keep" ${state.bulkClass==='keep'?'selected':''}>คงค่าเดิม</option><option value="private" ${state.bulkClass==='private'?'selected':''}>เรียนเดี่ยว</option>${groups.map(g=>`<option value="${esc(g.id)}" ${state.bulkClass===g.id?'selected':''}>กลุ่ม · ${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label for="bulk-basis">วิธีเลือกเวลา</label><select id="bulk-basis"><option value="keep">คงค่าเดิม</option><option value="tutor" ${state.bulkBasis==='tutor'?'selected':''}>เวลาติวเตอร์</option><option value="student" ${state.bulkBasis==='student'?'selected':''}>เวลานักเรียน</option><option value="overlap" ${state.bulkBasis==='overlap'?'selected':''}>เวลาซ้อนทับ</option><option value="person" ${state.bulkBasis==='person'?'selected':''}>ผู้เข้าร่วมอ้างอิง</option></select></div><div class="field"><label for="bulk-minutes">ตัดเอง (นาที · ไม่บังคับ)</label><input id="bulk-minutes" type="number" min="0" max="720" step="1" placeholder="คำนวณตามเวลา" value="${esc(state.bulkMinutes)}"></div></div>
    <label class="check mt12"><input type="checkbox" id="bulk-remember" ${state.bulkRemember?'checked':''}> จดจำชื่อ Meet ที่ได้รับการจับคู่ของรายการที่เลือก</label>
    <div class="button-row mt12"><button type="button" class="btn primary" data-action="bulk-import-apply">ใช้การตั้งค่ากับ ${selected.length} รายการ</button><span class="helper">ค่าเวลาแก้เฉพาะนักเรียนที่เลือกเท่านั้น · หากเลือกกลุ่ม ระบบตรวจสอบสมาชิกก่อน</span></div></section>`;
}
function selectImportBulk(mode){let changed=0;for(const d of importBulkTargets()){d.people.forEach((p,i)=>{if(i===d.tutorIndex)return;const status=getPersonStatus(d,p);const include=mode==='all'?true:mode==='matched'?!!p.studentId&&status.level!=='conflict':false;p.include=include;changed++;});}render();toast('อัปเดตการเลือก '+changed+' รายการ');}
function applyImportBulk(){const classValue=state.bulkClass,basis=state.bulkBasis,minutesRaw=state.bulkMinutes,hasMinutes=minutesRaw!=='';
  if(basis==='person'&&state.bulkScope==='batch')throw Error('การอ้างอิงเวลาผู้เข้าร่วม ต้องเลือกเฉพาะไฟล์นี้ เพื่อป้องกันการเลือกผิดคนข้ามไฟล์');
  if(hasMinutes&&(!Number.isInteger(Number(minutesRaw))||Number(minutesRaw)<0||Number(minutesRaw)>720))throw Error('นาทีที่ตัดต้องเป็นจำนวนเต็ม 0–720');
  if(basis==='custom'&&!hasMinutes)throw Error('เลือกกำหนดเองแล้วต้องกรอกนาทีที่จะตัด');
  const grp=classValue!=='keep'&&classValue!=='private'?byId('Groups',classValue):null;if(classValue!=='keep'&&classValue!=='private'&&!grp)throw Error('ไม่พบกลุ่มที่เลือก');
  let count=0,skipped=0;for(const d of importBulkTargets()){for(const [i,p] of d.people.entries()){
    if(i===d.tutorIndex||!p.include)continue;
    if(grp&&(!p.studentId||!membersOf(grp.id).includes(p.studentId))){skipped++;continue;}
    if(classValue!=='keep'){d.split=true;p.classChoice=classValue;p.courseId=proposedCourse(p.studentId,classValue==='private'?'private':'group',classValue)?.id||'';}
    if(basis!=='keep'){p.timeBasis=basis;if(!hasMinutes)p.manualMinutes=null;}
    if(hasMinutes)p.manualMinutes=Number(minutesRaw);
    if(state.bulkRemember&&p.studentId)p.remember=true;
    count++;
  }}render();toast('ตั้งค่ารวม '+count+' รายการ'+(skipped?' · ข้าม '+skipped+' รายการที่ไม่อยู่ในกลุ่ม':''),!!skipped);
}
function propagateMeetMapping(d,p){if(!p.studentId)return 0;let n=0;const key=norm(p.name),email=norm(p.email);
  for(const otherDraft of state.importDrafts){if(!otherDraft)continue;for(const [i,other] of otherDraft.people.entries()){
    if(otherDraft===d&&other===p||i===otherDraft.tutorIndex||other.studentId||norm(other.name)!==key||norm(other.email)!==email)continue;
    if(aliasConflict(other.name,other.email,p.studentId))continue;
    other.studentId=p.studentId;other.courseId=proposedCourse(p.studentId,otherDraft.classType,otherDraft.groupId)?.id||'';
    other.remember=true;other.include=true;other.matchLevel='match';other.matchReason='จับคู่ตามชื่อ Meet ที่คุณยืนยันในชุดไฟล์นี้';n++;
  }}return n;}
function importPage(){
  const draft=state.importDraft;
  return `${head('AUTOMATION / ATTENDANCE','Import Google Meet Excel','นำเข้าไฟล์ → สรุปวันเรียน → ตั้งค่าคลาส → จับคู่ชื่อ → สรุปก่อนบันทึก',btn('＋ Manual Entry','go-manual','soft'))}
  <section class="panel import-upload-panel"><div class="import-section-title"><span class="import-step">01</span><div><h2 class="panel-title">Upload Attendance Files</h2><p class="panel-desc">รองรับ Excel หลายไฟล์ในชุดเดียว · ยังไม่มีการตัดชั่วโมง</p></div></div>
  <div class="dropzone" id="excel-dropzone" role="region" aria-label="ลากวาง Excel หลายไฟล์"><div class="dropzone-icon">⇧</div><strong>ลากไฟล์ Excel หลายไฟล์มาวางพร้อมกัน</strong><small>.xlsx, .xls, .csv · สูงสุด 50 ไฟล์ต่อชุด · ไฟล์ละไม่เกิน 10 MB</small><label class="btn primary" for="excel-file">＋ เลือกไฟล์ Excel</label><input id="excel-file" type="file" accept=".xlsx,.xls,.csv" multiple hidden></div><div class="import-upload-progress" id="import-upload-progress" aria-live="polite" hidden></div></section>
  ${state.importQueue.length?batchOverview():''}
  ${draft&&!state.importDone[state.importIndex]?importBulkPanel():''}
  ${draft&&!state.importDone[state.importIndex]?importReview(draft):''}`;
}
function batchOverview(){
  const ds=state.importDrafts.filter(Boolean),uniqueDays=new Set(ds.filter(d=>dateValid(d.date)).map(d=>d.date));
  const clocks=ds.map(reportClock),tutorSum=clocks.reduce((a,x)=>a+x.minutes,0);
  const unknown=ds.reduce((a,d)=>a+d.people.filter((p,i)=>i!==d.tutorIndex&&!p.studentId).length,0);
  const selected=importBatchIndices();
  const sorted=state.importQueue.map((file,i)=>({file,i,d:state.importDrafts[i]})).sort((a,b)=>(a.d?.date||'9999').localeCompare(b.d?.date||'9999')||a.i-b.i);
  const visible=sorted.filter(x=>!state.importIssueOnly||reportStatus(x.d,x.i).tone!=='green');
  return `<section class="panel import-summary-panel" id="import-summary"><div class="panel-head"><div class="import-section-title"><span class="import-step">02</span><div><h2 class="panel-title">Imported Class Summary</h2><p class="panel-desc">รายการวันที่และเวลาจากทุกไฟล์ · คลิกตรวจคาบใดก็ได้</p></div></div>${btn('ล้างชุดไฟล์','reset-import','small')}</div>
  <div class="import-metrics"><div><small>ไฟล์ที่อ่านได้</small><strong>${ds.length}/${state.importQueue.length}</strong></div><div><small>วันเรียน</small><strong>${uniqueDays.size}</strong></div><div><small>ช่วงเวลาเข้าร่วมติวเตอร์รวม*</small><strong>${esc(nice(tutorSum))}</strong></div><div><small>ชื่อยังไม่จับคู่</small><strong>${unknown}</strong></div></div>
  <div class="import-table-toolbar"><label class="check import-check"><input type="checkbox" id="import-issue-only" ${state.importIssueOnly?'checked':''}> แสดงเฉพาะรายการที่ต้องตรวจสอบ</label><span class="helper">เลือก ${selected.length} ไฟล์สำหรับบันทึก Pending</span></div>
  <div class="table-wrap import-record-table"><table><thead><tr><th>เลือก</th><th>วันที่เรียน</th><th>ช่วงเวลา</th><th>เวลาติวเตอร์*</th><th>ผู้เรียน</th><th>ชื่อไฟล์ / แหล่งวันที่</th><th>สถานะ</th><th>ตรวจ</th></tr></thead><tbody>
  ${visible.map(({file,i,d})=>{const clock=reportClock(d),status=reportStatus(d,i),count=d?d.people.filter((p,j)=>j!==d.tutorIndex).length:0;return `<tr class="${i===state.importIndex?'is-current':''}"><td><input type="checkbox" aria-label="รวมไฟล์ ${esc(file.name)}" data-batch-select="${i}" ${state.batchIncluded[i]!==false&&!!d&&!state.importDone[i]?'checked':''} ${!d||!!state.importDone[i]?'disabled':''}></td><td><strong>${d&&dateValid(d.date)?esc(displayReportDate(d.date)):'ต้องระบุวันที่'}</strong>${d?.dateConflict?'<small class="import-flag">วันที่ขัดแย้ง</small>':''}</td><td>${clock.start?`<span class="nowrap">${clock.start}–${clock.end}</span>`:'—'}</td><td><strong>${esc(nice(clock.minutes))}</strong></td><td>${count} คน</td><td><span class="import-filename" title="${esc(file.name)}">${esc(file.name)}</span><small>${!d?'—':d.dateSource==='excel'?'วันที่จาก Excel':d.dateSource==='filename'?'วันที่จากชื่อไฟล์':'ยังไม่ทราบวันที่'}</small></td><td>${pill(status.label,status.tone)}</td><td><button type="button" class="btn small ${i===state.importIndex?'primary':'soft'}" data-action="import-switch" data-id="${i}">ตรวจสอบ</button></td></tr>`;}).join('')||'<tr><td colspan="8" class="empty">ไม่มีรายการที่ตรงกับตัวกรอง</td></tr>'}
  </tbody></table></div><p class="helper mt12">* นับระยะเวลาที่ติวเตอร์อยู่ใน Meet จากแต่ละรายงาน ไม่ใช่ชั่วโมงที่หักจากกระเป๋านักเรียน และไฟล์ที่มีเวลาซ้อนกันอาจเป็นคาบเดียวกัน</p>
  <div class="import-summary-actions"><div class="button-row">${btn('เลือกทุกไฟล์ที่ยังไม่บันทึก','batch-select-all','small soft')}${btn('ล้างการเลือก','batch-select-none','small')}</div><button type="button" class="btn primary" data-action="preview-batch-import">สรุปก่อนบันทึก ${selected.length} ไฟล์ →</button></div></section>`;
}
function displayReportDate(iso){if(!dateValid(iso))return '—';return iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4);}
function importBulkPanel(){
  const targets=importBulkTargets(),students=targets.flatMap(d=>d.people.filter((p,i)=>i!==d.tutorIndex)),selected=students.filter(p=>p.include),groups=all('Groups'),d=state.importDraft;
  if(!d)return '';
  const timeChoices=['tutor','student','overlap','person','custom'];
  const anyPerson=state.bulkBasis==='person'||(state.bulkBasis==='keep'&&d.basis==='person');
  const dateNote=d.dateSource==='excel'?'อ่านวันที่จาก Excel':d.dateSource==='filename'?'อ่านวันที่จากชื่อไฟล์':'ไม่พบวันที่อัตโนมัติ';
  return `<section class="panel bulk-panel" id="import-config"><div class="import-section-title"><span class="import-step">03</span><div><h2 class="panel-title">Class Configuration</h2><p class="panel-desc">ตั้งค่าคาบเรียนครั้งเดียว แล้วใช้กับรายการที่เลือก · ไม่ตัดชั่วโมงทันที</p></div></div>
  <div class="config-source"><div class="config-source-heading"><strong>ข้อมูลคาบที่กำลังตรวจ</strong><span>${esc(d.filename)}</span></div><div class="grid-2">${field('import-date','วันที่เรียน ('+dateNote+')','date',d.date,'required')}${selectField('import-tutor','ติวเตอร์',d.people.map((p,i)=>`<option value="${i}" ${i===d.tutorIndex?'selected':''}>${esc(p.name)} (${esc(nice(p.actual))})</option>`).join(''))}</div>
  ${d.dateConflict?`<div class="note warn mt12">${esc(d.dateNotes||'วันที่ในรายงานไม่ตรงกัน')} · โปรดตรวจสอบวันที่แล้วเลือกยืนยัน</div><button class="btn small soft mt12" type="button" data-action="confirm-import-date">✓ ยืนยันวันที่ที่แสดง</button>`:''}</div>
  <div class="config-line"><div class="field"><label for="bulk-scope">ใช้การตั้งค่ากับ</label><select id="bulk-scope"><option value="current" ${state.bulkScope==='current'?'selected':''}>เฉพาะไฟล์นี้</option><option value="batch" ${state.bulkScope==='batch'?'selected':''}>ทุกไฟล์ที่ยังไม่บันทึก</option></select></div><div class="button-row"><button class="btn small soft" type="button" data-action="bulk-select-all">☑ เลือกทั้งหมด</button><button class="btn small soft" type="button" data-action="bulk-select-matched">✓ เฉพาะที่จับคู่แล้ว</button><button class="btn small" type="button" data-action="bulk-select-none">ไม่เลือกทั้งหมด</button></div></div>
  <div class="grid-3 mt12"><div class="field"><label for="bulk-class">ประเภทคลาสที่ต้องการใช้</label><select id="bulk-class"><option value="keep" ${state.bulkClass==='keep'?'selected':''}>คงค่าที่ตั้งไว้</option><option value="private" ${state.bulkClass==='private'?'selected':''}>เรียนเดี่ยว</option>${groups.map(g=>`<option value="${esc(g.id)}" ${state.bulkClass===g.id?'selected':''}>กลุ่ม · ${esc(g.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="bulk-basis">วิธีคำนวณชั่วโมง</label><select id="bulk-basis"><option value="keep" ${state.bulkBasis==='keep'?'selected':''}>คงค่าที่ตั้งไว้</option><option value="tutor" ${state.bulkBasis==='tutor'?'selected':''}>เวลาติวเตอร์</option><option value="student" ${state.bulkBasis==='student'?'selected':''}>เวลานักเรียนแต่ละคน</option><option value="overlap" ${state.bulkBasis==='overlap'?'selected':''}>เวลาที่อยู่พร้อมกัน</option><option value="person" ${state.bulkBasis==='person'?'selected':''}>เวลาผู้เข้าร่วมที่เลือก</option><option value="custom" ${state.bulkBasis==='custom'?'selected':''}>กำหนดนาทีเอง</option></select></div>
  <div class="field" ${state.bulkBasis!=='custom'?'hidden':''} id="bulk-minutes-field"><label for="bulk-minutes">จำนวนนาที (Custom)</label><input id="bulk-minutes" type="number" min="0" max="720" step="1" placeholder="เช่น 90" value="${esc(state.bulkMinutes)}"></div></div>
  ${anyPerson?`<div class="field config-source-picker">${selectField('import-source','บุคคลอ้างอิง (เฉพาะไฟล์นี้)',d.people.map((p,i)=>`<option value="${i}" ${d.sourceIndex===i?'selected':''}>${esc(p.name)} (${esc(nice(p.actual))})</option>`).join(''))}</div>`:''}
  <p class="helper mt12">ค่าปัจจุบันของไฟล์นี้: ${esc(d.split?'แยกคลาสรายคน':d.classType==='group'?byId('Groups',d.groupId)?.name||'เรียนกลุ่ม':'เรียนเดี่ยว')} · ${esc(({tutor:'เวลาติวเตอร์',student:'เวลานักเรียน',overlap:'เวลาอยู่พร้อมกัน',person:'เวลาบุคคลอ้างอิง',custom:'กำหนดเอง'})[d.basis]||d.basis)} · ตั้งค่าใหม่แล้วกด “ใช้การตั้งค่า”</p><div class="config-checks"><label class="check import-check"><input type="checkbox" id="bulk-remember" ${state.bulkRemember?'checked':''}> จดจำชื่อ Meet ที่จับคู่แล้ว</label><label class="check import-check"><input type="checkbox" id="import-split" ${d.split?'checked':''}> ใช้รายงานเดียวแยกหลายคลาส (ตั้งค่าแต่ละคนด้านล่าง)</label></div>
  <div class="config-bottom"><button type="button" class="btn primary" data-action="bulk-import-apply">ใช้การตั้งค่ากับ ${selected.length} รายการ</button><span class="helper">เลือกแล้ว ${selected.length}/${students.length} คน · รายการชื่อไม่ชัดเจนต้องจับคู่ก่อนบันทึก</span></div></section>`;
}
function importReview(d){
  const status=reportStatus(d,state.importIndex),suggest=recommendedGroup(d);
  return `<section class="panel import-people-panel" id="import-people"><div class="panel-head"><div class="import-section-title"><span class="import-step">04</span><div><h2 class="panel-title">Student & Meet Matching</h2><p class="panel-desc">ตรวจรายชื่อใน ${esc(d.filename)} · ผู้ที่จับคู่แล้วจะเสนอคอร์สให้อัตโนมัติ</p></div></div>${pill(status.label,status.tone)}</div>
  ${suggest?`<div class="note">อาจตรงกับกลุ่ม <strong>${esc(suggest.name)}</strong> ${btn('ใช้กลุ่มนี้','suggest-import-group','small soft').replace('data-action=',`data-id="${esc(suggest.id)}" data-action=`)}</div>`:''}
  <div class="note">สีเขียว = จับคู่แล้ว · สีเหลือง = ชื่อไม่เหมือนหรือพบคนละไฟล์ · สีแดง = ต้องจับคู่ก่อนบันทึก · ติวเตอร์ไม่ถูกนำไปตัดชั่วโมง</div>
  <div id="import-participants">${importParticipants(d)}</div>
  <div class="import-final-actions"><div><strong>05 · Final Review</strong><p class="helper">เปิดหน้าสรุปวันที่ นักเรียน คอร์ส และยอดชั่วโมงก่อนยืนยันทุกครั้ง</p></div><div class="button-row"><button type="button" class="btn primary" data-action="preview-batch-import">สรุปก่อนบันทึกไฟล์ที่เลือก →</button><button type="button" class="btn soft" data-action="preview-import">สรุปเฉพาะไฟล์นี้</button></div></div></section>`;
}
function importParticipants(d){
  return `<div class="table-wrap import-participant-table"><table><thead><tr><th>เลือก</th><th>ชื่อจาก Google Meet</th><th>นักเรียน</th><th>คอร์สที่จะตัด</th><th>เข้าร่วมจริง</th><th>หักนาที</th><th>สถานะ / ตัวเลือก</th></tr></thead><tbody>${d.people.map((p,i)=>{
    const tutor=i===d.tutorIndex,student=p.studentId?byId('Students',p.studentId):null;
    const effectiveGroup=d.split?(p.classChoice||'private'):d.classType==='group'?d.groupId:'private';
    const groupChoice=effectiveGroup==='private'?'':effectiveGroup;
    const course=student?proposedCourse(student.id,groupChoice?'group':'private',groupChoice):null;
    const val=p.manualMinutes===null?adjustedByRule(calculatedImport(d,p),ruleFor('group',groupChoice)):Number(p.manualMinutes);
    const check=tutor?{level:'tutor',text:'ติวเตอร์',note:''}:getPersonStatus(d,p);
    const myGroups=student?groupsOfStudent(student.id):[];
    return `<tr class="status-${check.level}"><td><input type="checkbox" data-import-include="${i}" aria-label="เลือก ${esc(p.name)}" ${p.include&&!tutor?'checked':''} ${tutor?'disabled':''}></td>
      <td><strong>${esc(p.name)}</strong><small>${esc(p.email||'ไม่มีอีเมล')}</small><small>เข้า ${esc(p.join||'–')} · ออก ${esc(p.leave||'–')}</small></td>
      <td>${tutor?pill('ติวเตอร์','blue'):`<select data-import-student="${i}" aria-label="จับคู่นักเรียน ${esc(p.name)}">${studentOptions(p.studentId)}</select>`}</td>
      <td>${tutor?'—':`<select data-import-course="${i}" aria-label="คอร์สของ ${esc(p.name)}">${courseOptions(p.studentId,p.courseId||course?.id)}</select>`}</td>
      <td class="nowrap">${esc(nice(p.actual))}</td><td>${tutor?'—':`<input type="number" data-import-minutes="${i}" aria-label="นาทีหักของ ${esc(p.name)}" min="0" max="720" value="${num(p.manualMinutes??val)}">`}</td>
      <td>${pill(check.text,check.level==='unknown'||check.level==='conflict'?'red':check.level==='different'?'gold':check.level==='match'?'green':'blue')}
      ${!tutor?`<details class="person-options"><summary>รายละเอียดเพิ่มเติม</summary><label class="check"><input type="checkbox" data-import-remember="${i}" ${p.remember?'checked':''} ${!p.studentId?'disabled':''}> จดจำชื่อ Meet</label>${d.split?`<div class="field"><label>คลาสของนักเรียนนี้</label><select data-import-class="${i}"><option value="private" ${effectiveGroup==='private'?'selected':''}>เรียนเดี่ยว</option>${myGroups.map(g=>`<option value="${esc(g.id)}" ${effectiveGroup===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div>`:''}<small>${esc(check.note||p.matchReason||'')}</small></details>`:''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function calculatedImport(d,p){const tutor=d.people[d.tutorIndex],basis=p.timeBasis||d.basis;if(basis==='custom')return num(p.manualMinutes??p.actual);if(basis==='student')return p.actual;if(basis==='overlap')return tutor?overlapMinutes(tutor.segments,p.segments):p.actual;if(basis==='person')return d.people[d.sourceIndex]?.actual??p.actual;return tutor?.actual??p.actual;}
function overlapMinutes(a,b){const intersections=[];for(const aa of a)for(const bb of b){const x=Math.max(aa[0],bb[0]),y=Math.min(aa[1],bb[1]);if(y>x)intersections.push([x,y]);}return mergeSegments(intersections).reduce((sum,s)=>sum+s[1]-s[0],0);}
function reviews(){const sessions=sessionsSorted().filter(s=>state.filter==='all'||s.status===state.filter);return `${head('APPROVAL / LEDGER','Review & History','รายการรอตรวจสอบ ประวัติคาบเรียน การตัดชั่วโมง และการแก้ไขย้อนหลัง')}<div class="toolbar"><select class="pill-select" id="history-filter"><option value="all" ${state.filter==='all'?'selected':''}>ทั้งหมด</option><option value="pending" ${state.filter==='pending'?'selected':''}>Pending</option><option value="approved" ${state.filter==='approved'?'selected':''}>Approved</option><option value="cancelled" ${state.filter==='cancelled'?'selected':''}>Cancelled</option></select><div class="button-row"><button type="button" class="btn small soft" data-action="review-select-all">☑ เลือก Pending ทั้งหมด</button><button type="button" class="btn small" data-action="review-select-none">ล้างที่เลือก</button><button type="button" class="btn small primary" data-action="review-approve-selected">สรุปก่อนอนุมัติ (<span id="review-selected-count">${state.reviewSelection.length}</span>)</button></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>SELECT</th><th>DATE / TIME</th><th>METHOD</th><th>STUDENTS</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${sessions.map(s=>`<tr><td>${s.status==='pending'?`<input type="checkbox" aria-label="เลือกคาบ ${esc(s.date)}" data-review-check="${esc(s.id)}" ${state.reviewSelection.includes(s.id)?'checked':''}>`:'—'}</td><td>${esc(s.date)}<div class="td-secondary">${esc(s.start_time)}–${esc(s.end_time)}</div></td><td>${esc(s.mode)}<div class="td-secondary truncate">${esc(s.source_file||s.tutor)}</div></td><td>${all('Attendance').filter(a=>a.session_id===s.id).length}</td><td>${pill(s.status,s.status==='approved'?'green':s.status==='pending'?'gold':'red')}</td><td><div class="button-row">${btnInline('รายละเอียด','session-detail',s.id)} ${s.status==='pending'?btnInline('Approve','approve-session',s.id):''}</div></td></tr>`).join('')||'<tr><td colspan="6" class="empty">ยังไม่มีประวัติคาบเรียน</td></tr>'}</tbody></table></div></div>`;}
function learningHistory(){
  const sessions=all('Sessions').filter(s=>dateValid(s.date)).sort((a,b)=>b.date.localeCompare(a.date)||b.start_time.localeCompare(a.start_time));
  const tutors=[...new Set(sessions.map(s=>s.tutor).filter(Boolean))].sort();
  const selected=sessions.filter(s=>(!state.historyFrom||s.date>=state.historyFrom)&&(!state.historyTo||s.date<=state.historyTo)&&(state.historyStatus==='all'||s.status===state.historyStatus)&&(!state.historyTutor||s.tutor===state.historyTutor)&&(!state.historyGroup||s.group_id===state.historyGroup)&&(!state.historyStudent||all('Attendance').some(a=>a.session_id===s.id&&a.student_id===state.historyStudent)));
  const totalTeaching=selected.reduce((n,s)=>n+duration(s.start_time,s.end_time),0),totalDeduct=selected.reduce((n,s)=>n+all('Attendance').filter(a=>a.session_id===s.id&&s.status==='approved').reduce((sum,a)=>sum+num(a.deduct_minutes),0),0);
  const oneRow=s=>{const attends=all('Attendance').filter(a=>a.session_id===s.id),label=s.group_id?byId('Groups',s.group_id)?.name||'กลุ่มเรียน':attends.map(a=>studentName(a.student_id)).join(', ')||'ไม่มีผู้เรียน';return `<tr><td><strong>${esc(displayReportDate(s.date))}</strong></td><td class="nowrap">${esc(s.start_time)}–${esc(s.end_time)}</td><td>${esc(nice(duration(s.start_time,s.end_time)))}</td><td>${esc(s.tutor||'-')}</td><td><strong>${esc(label)}</strong><small>${attends.length} นักเรียน · ${esc(s.mode)}</small></td><td>${s.status==='approved'?esc(nice(attends.reduce((n,a)=>n+num(a.deduct_minutes),0))):'ยังไม่ตัด'}</td><td>${pill(s.status,s.status==='approved'?'green':s.status==='pending'?'gold':'red')}</td><td>${btnInline('รายละเอียด','session-detail',s.id)}</td></tr>`};
  const groups=new Map();for(const s of selected){if(!groups.has(s.date))groups.set(s.date,[]);groups.get(s.date).push(s);}
  return `${head('ATTENDANCE / HISTORY','Learning History','ค้นหาตามวันเรียน ติวเตอร์ นักเรียน กลุ่ม และสถานะ · เปิดรายละเอียดคาบได้')}
  <section class="panel"><div class="grid-3 history-filter-grid"><div class="field"><label for="history-from">ตั้งแต่วันที่</label><input type="date" id="history-from" value="${esc(state.historyFrom)}"></div><div class="field"><label for="history-to">ถึงวันที่</label><input type="date" id="history-to" value="${esc(state.historyTo)}"></div><div class="field"><label for="history-tutor">ติวเตอร์</label><select id="history-tutor"><option value="">ทุกคน</option>${tutors.map(v=>`<option value="${esc(v)}" ${state.historyTutor===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
  <div class="field"><label for="history-student">นักเรียน</label><select id="history-student">${studentOptions(state.historyStudent).replace('— เลือกนักเรียน —','ทุกคน')}</select></div><div class="field"><label for="history-group">กลุ่มเรียน</label><select id="history-group"><option value="">ทุกกลุ่ม</option>${all('Groups').map(g=>`<option value="${esc(g.id)}" ${state.historyGroup===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label for="history-course">คอร์ส / รอบเรียน</label><select id="history-course"><option value="">ทุกคอร์ส</option>${all('Courses').map(c=>`<option value="${esc(c.id)}" ${state.historyCourse===c.id?'selected':''}>${esc(studentName(c.student_id))} · ${esc(c.title)} รอบ ${esc(c.cycle_no)}</option>`).join('')}</select></div><div class="field"><label for="history-status">สถานะ</label><select id="history-status">${['all','pending','approved','cancelled'].map(x=>`<option value="${x}" ${state.historyStatus===x?'selected':''}>${x==='all'?'ทั้งหมด':x}</option>`).join('')}</select></div></div>
  <div class="history-switch"><div class="button-row"><button class="btn small ${state.historyLayout==='table'?'primary':'soft'}" data-action="history-view-table">☷ ตาราง</button><button class="btn small ${state.historyLayout==='day'?'primary':'soft'}" data-action="history-view-day">▦ แยกตามวัน</button></div>${btn('ล้างตัวกรอง','history-clear','small')}</div>
  <div class="import-metrics history-metrics"><div><small>จำนวนวันที่เรียน</small><strong>${groups.size}</strong></div><div><small>จำนวนคาบ</small><strong>${selected.length}</strong></div><div><small>ชั่วโมงสอนตามช่วงเวลา</small><strong>${esc(nice(totalTeaching))}</strong></div><div><small>หักชั่วโมงนักเรียนที่อนุมัติแล้ว</small><strong>${esc(nice(totalDeduct))}</strong></div></div>
  ${state.historyLayout==='day'?`<div class="history-days">${[...groups].map(([date,ss])=>`<details class="history-day" open><summary><strong>${esc(displayReportDate(date))}</strong><span>${ss.length} คาบ · ${esc(nice(ss.reduce((n,s)=>n+duration(s.start_time,s.end_time),0)))}</span></summary><div class="table-wrap"><table><thead><tr><th>วัน</th><th>เวลา</th><th>ชั่วโมงสอน</th><th>ติวเตอร์</th><th>นักเรียน/กลุ่ม</th><th>หักชั่วโมง</th><th>สถานะ</th><th>ดู</th></tr></thead><tbody>${ss.map(oneRow).join('')}</tbody></table></div></details>`).join('')||'<div class="empty">ไม่มีประวัติที่ตรงกับตัวกรอง</div>'}</div>`:`<div class="table-wrap history-results"><table><thead><tr><th>วันที่</th><th>เวลา</th><th>ชั่วโมงสอน</th><th>ติวเตอร์</th><th>นักเรียน/กลุ่ม</th><th>หักชั่วโมง</th><th>สถานะ</th><th>ดู</th></tr></thead><tbody>${selected.map(oneRow).join('')||'<tr><td colspan="8" class="empty">ไม่พบคาบเรียนที่ตรงกับตัวกรอง</td></tr>'}</tbody></table></div>`}
  <p class="helper mt12">ชั่วโมงสอนนับต่อคาบ ส่วนชั่วโมงที่หักจากแพ็กเกจอาจมากกว่าเมื่อเป็นการเรียนกลุ่ม และยังไม่รวมคาบ Pending</p></section>`;
}
function reports(){const approved=all('Sessions').filter(s=>s.status==='approved');const purchased=all('Ledger').filter(x=>x.type==='purchase').reduce((n,x)=>n+num(x.minutes),0);const deducted=all('Ledger').filter(x=>x.type==='deduct').reduce((n,x)=>n-num(x.minutes),0);const monthly=new Map();for(const s of approved){const month=(s.date||'').slice(0,7);monthly.set(month,(monthly.get(month)||0)+duration(s.start_time,s.end_time));}const bar=[...monthly].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6),max=Math.max(1,...bar.map(x=>x[1]));return `${head('ANALYTICS / EXPORT','Reports & Summary','รายงานการสอน ชั่วโมงซื้อ และยอดคงเหลือ พร้อมส่งออกข้อมูล',`<div class="button-row">${btn('ตรวจสอบความถูกต้อง','integrity-check','soft')}${btn('⇩ Export CSV','export-csv','soft')}${btn('Print / Save PDF','print-report','primary')}</div>`)}<div class="stats"><div class="stat"><div class="mini">Approved Sessions</div><div class="big">${approved.length}</div></div><div class="stat"><div class="mini">Package Hours Sold</div><div class="big">${fmt(purchased)}</div></div><div class="stat"><div class="mini">Hours Deducted</div><div class="big">${fmt(deducted)}</div></div><div class="stat"><div class="mini">Students</div><div class="big">${all('Students').length}</div></div></div><div class="two-col"><section class="panel"><h2 class="panel-title">Teaching Sessions by Month</h2><p class="panel-desc">นับระยะเวลาคาบเรียน ไม่ใช่ยอดการหักรวมทุกคน</p>${bar.map(([month,mins])=>`<div class="bar-row"><span>${esc(month)}</span><div class="bar-bg"><div class="bar-value" style="width:${Math.round(mins/max*100)}%"></div></div><strong>${fmt(mins)}</strong></div>`).join('')||'<div class="empty">ยังไม่มีข้อมูล</div>'}</section><section class="panel"><h2 class="panel-title">Student Balances</h2>${all('Students').map(s=>`<div class="list-row"><div><strong style="font-size:12px">${esc(s.name)}</strong><div class="td-secondary">${liveCourses(s.id).length} active courses</div></div><strong class="amount">${fmt(currentStudentTotal(s.id))}</strong></div>`).join('')}</section></div><div class="note">รายงาน PDF ใช้หน้าต่างพิมพ์ของเบราว์เซอร์ (เลือก Save as PDF) และ CSV เปิดใน Excel ได้ รองรับข้อมูลภาษาไทยด้วย UTF-8 BOM</div>`;}
function openConnection(){modal('Google Sheets · ตั้งค่าการเชื่อมต่อ',`<div class="form"><div class="note">ตั้งค่าครั้งเดียว ระบบจดจำ Client ID และ Spreadsheet ID ที่ไม่ใช่รหัสลับบนเบราว์เซอร์นี้ และใช้ฐานข้อมูลจริงหลังลงชื่อเข้าใช้ Google</div><div class="field"><label for="connection-client">Google OAuth Web Client ID</label><input id="connection-client" type="text" autocomplete="off" spellcheck="false" value="${esc(config.googleClientId||'')}" placeholder="xxxxxxxx.apps.googleusercontent.com"></div><div class="field"><label for="connection-sheet">Google Spreadsheet ID หรือ URL</label><input id="connection-sheet" type="text" autocomplete="off" spellcheck="false" value="${esc(config.spreadsheetId||'')}" placeholder="จาก URL ของ Google Sheets"></div><div class="button-row"><button type="button" class="btn primary" data-action="save-connection">บันทึกการตั้งค่า</button><button type="button" class="btn" data-action="google-signin" ${!liveConfigured?'disabled':''}>${state.mode==='live'?'เชื่อมบัญชีใหม่':'เชื่อมบัญชี Google'}</button>${state.mode==='live'?'<button type="button" class="btn danger" data-action="disconnect">ออกจากระบบ</button>':''}</div><p class="helper">เก็บเฉพาะตัวระบุสาธารณะ ไม่จัดเก็บ Google Client Secret, รหัสผ่าน หรือ access token แบบถาวร · หลังสิทธิ์หมดอายุอาจต้องคลิก Google Sign-In อีกครั้งตามนโยบาย Google</p></div>`);}
function saveConnection(){const client=($('#connection-client')?.value||'').trim(),raw=($('#connection-sheet')?.value||'').trim();const id=(raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)||[])[1]||raw;if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Client ID ไม่ถูกต้อง ควรลงท้าย .apps.googleusercontent.com');if(!/^[a-zA-Z0-9_-]{15,}$/.test(id))throw Error('Spreadsheet ID ไม่ถูกต้อง กรุณาวาง ID หรือ URL ของชีต');const changed=client!==config.googleClientId||id!==config.spreadsheetId;if(changed){clearGoogleSession();state.token='';state.tokenClient=null;store=new DemoStore();}config.googleClientId=client;config.spreadsheetId=id;liveConfigured=true;safeStorage('local','set',SETTINGS_KEY,JSON.stringify({googleClientId:client,spreadsheetId:id}));state.mode=changed?'needs_login':state.mode;closeModal();render();toast('บันทึกการตั้งค่า Google Sheets แล้ว');}
function googleLogin(){if(!liveConfigured){openConnection();return;}if(!window.google?.accounts?.oauth2)throw Error('โหลด Google Sign-In ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต / การปิดกั้นสคริปต์');if(!state.tokenClient){state.tokenClient=google.accounts.oauth2.initTokenClient({client_id:config.googleClientId,scope:'https://www.googleapis.com/auth/spreadsheets',callback:async resp=>{if(resp.error)return notice(resp.error);try{state.token=resp.access_token;store=new SheetsStore(state.token);const loaded=await store.load();state.data=loaded;state.mode='live';rememberGoogleSession(resp.access_token,resp.expires_in);closeModal();render();toast('เชื่อม Google Sheets สำเร็จ · รีเฟรชหน้านี้ได้โดยไม่ต้องเชื่อมใหม่จนกว่าเซสชันจะหมดอายุ');}catch(e){state.mode='needs_login';clearGoogleSession();state.token='';store=new DemoStore();render();notice(e);}},error_callback:e=>notice(e?.message||'Google Sign-In error')});}
// This action is launched by a real user click. GIS cannot refresh a browser token silently after expiry.
state.tokenClient.requestAccessToken({prompt:''});}
function disconnect(){const oldToken=state.token;state.token='';clearGoogleSession();state.mode=liveConfigured?'needs_login':'demo';store=new DemoStore();if(window.google?.accounts?.oauth2&&oldToken)google.accounts.oauth2.revoke(oldToken,()=>{});closeModal();if(state.mode==='needs_login')render();else reload().catch(notice);}
function openStudentForm(existing){const s=existing||{};modal(existing?'แก้ไขข้อมูลนักเรียน':'เพิ่มนักเรียน',`<form id="student-form" class="form"><input type="hidden" name="id" value="${esc(s.id||'')}"><div class="grid-2">${field('student-name','ชื่อเล่น / ชื่อที่ใช้แสดง','text',s.name||'','required')}${field('student-fullname','ชื่อ–นามสกุล','text',s.full_name||'')}</div><div class="grid-2">${field('student-school','โรงเรียน','text',s.school||'')}${selectField('student-grade','ระดับชั้น',gradeOptions(s.grade_level||''))}</div><div class="grid-2">${field('student-academic-year','ปีการศึกษา','text',s.academic_year||'')}${field('student-email','อีเมล','email',s.email||'')}</div>${field('student-aliases','ชื่อ Google Meet (คั่นด้วยจุลภาค)','text',s.aliases||'')}${selectField('student-status','สถานะ',`<option value="active" ${s.status!=='archived'?'selected':''}>กำลังเรียน</option><option value="archived" ${s.status==='archived'?'selected':''}>พักเรียน</option>`)}<div class="field"><label>หมายเหตุ</label><textarea name="student-notes" rows="2">${esc(s.notes||'')}</textarea></div><div class="note">เมื่อแก้โรงเรียนหรือระดับชั้น ระบบจะเก็บประวัติการเปลี่ยนแปลง และไม่เปลี่ยนยอดชั่วโมงเรียน</div><button type="submit" class="btn primary">บันทึกนักเรียน</button></form>`);}
function gradeOptions(selected){const opts=['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6','ปวช.1','ปวช.2','ปวช.3','ปวส.1','ปวส.2','มหาวิทยาลัย','อื่น ๆ'];if(selected&&!opts.includes(selected))opts.unshift(selected);return `<option value="">— ไม่ระบุ —</option>`+opts.map(g=>`<option value="${esc(g)}" ${g===selected?'selected':''}>${esc(g)}</option>`).join('');}
function openCourseForm(studentId=''){modal('สร้างคอร์สใหม่',`<form id="course-form" class="form">${selectField('course-student','นักเรียน',studentOptions(studentId),'required')}${field('course-title','ชื่อคอร์ส','text','Biology Olympiad','required')}<div class="grid-2">${field('course-date','วันเริ่มคอร์ส','date',dateNow(),'required')}${field('course-hours','จำนวนชั่วโมงที่ซื้อ','number','10','min="0.25" step="0.25" required')}</div><p class="helper">สร้างคอร์สใหม่แบบอิสระ หากต้องการต่อจากคอร์สเดิมให้กด “ต่อคอร์ส” ในโปรไฟล์นักเรียนเพื่อเก็บลำดับรอบ</p><button type="submit" class="btn primary">สร้างคอร์ส</button></form>`);}
function openRenew(c){if(!c)return;const b=balance(c.id);modal('ต่อคอร์ส · '+studentName(c.student_id),`<form id="renew-form" class="form"><input type="hidden" name="old_id" value="${esc(c.id)}"><div class="note">คอร์สเดิม <b>${esc(c.title)} · รอบ ${esc(c.cycle_no)}</b> คงเหลือ ${fmt(b)} ชั่วโมง<br>เมื่อยืนยันจะสร้างรอบใหม่และซ่อนรอบเดิมจากหน้าปัจจุบัน โดยยังเปิดดูประวัติย้อนหลังได้</div>${field('renew-title','ชื่อคอร์สรอบใหม่','text',c.title,'required')}<div class="grid-2">${field('renew-date','วันที่เริ่มเรียน','date',dateNow(),'required')}${field('renew-hours','ชั่วโมงที่ซื้อเพิ่ม','number','10','step="0.25" min="0" required')}</div>${selectField('renew-policy','จัดการชั่วโมงคงเหลือของรอบเก่า',`<option value="transfer" ${coursePolicy(c.id)?.rollover_policy!=='keep'&&coursePolicy(c.id)?.rollover_policy!=='close'?'selected':''}>ยกยอด ${fmt(b)} ชั่วโมงไปคอร์สใหม่</option><option value="close" ${coursePolicy(c.id)?.rollover_policy==='close'?'selected':''}>ปิดยอดเก่าและเริ่มรอบใหม่</option><option value="keep" ${coursePolicy(c.id)?.rollover_policy==='keep'?'selected':''}>เก็บยอดในคอร์สเดิมให้ใช้ได้ต่อ (Held)</option>`)}<button class="btn primary" type="submit">ยืนยันการต่อคอร์ส</button></form>`);}
function openTopup(c){if(!c)return;modal('เติมชั่วโมงคอร์สเดิม',`<form id="topup-form" class="form"><input type="hidden" name="course_id" value="${esc(c.id)}"><div class="note">${esc(studentName(c.student_id))} / ${esc(c.title)} · คงเหลือ ${fmt(balance(c.id))} ชั่วโมง</div>${field('topup-hours','ชั่วโมงที่เพิ่ม','number','5','min="0.25" step="0.25" required')}${field('topup-note','หมายเหตุ','text','ซื้อชั่วโมงเพิ่มเติม')}<button class="btn primary" type="submit">เพิ่มชั่วโมง</button></form>`);}
function openGroupForm(g){const m=(g?.member_ids||'').split('|');modal(g?'แก้ไขกลุ่มเรียน':'สร้างกลุ่มเรียน',`<form id="group-form" class="form"><input type="hidden" name="id" value="${esc(g?.id||'')}">${field('group-name','ชื่อกลุ่มเรียน','text',g?.name||'','required')}<div class="field"><label>เลือกสมาชิกในกลุ่ม</label>${all('Students').filter(s=>s.status==='active').map(s=>`<label class="check" style="display:flex;gap:9px;margin:8px 0"><input name="member" type="checkbox" value="${esc(s.id)}" ${m.includes(s.id)?'checked':''}>${esc(s.name)}</label>`).join('')}</div><button type="submit" class="btn primary">บันทึกกลุ่มเรียน</button></form>`);}
function courseHistory(courseId){const c=byId('Courses',courseId);if(!c)return;const ledger=all('Ledger').filter(l=>l.course_id===courseId).sort((a,b)=>b.created_at.localeCompare(a.created_at));const attends=all('Attendance').filter(a=>a.course_id===courseId);modal('ประวัติคอร์ส · '+c.title,`<div class="metric-strip"><div><small>นักเรียน</small><b>${esc(studentName(c.student_id))}</b></div><div><small>รอบ</small><b>${esc(c.cycle_no)}</b></div><div><small>คงเหลือ</small><b>${fmt(balance(c.id))}</b></div></div><h3 class="panel-title mt20">Hour Ledger (ประวัติการเปลี่ยนแปลง)</h3><div class="table-wrap mt12"><table><thead><tr><th>DATE</th><th>TYPE</th><th>CHANGE</th><th>NOTE</th></tr></thead><tbody>${ledger.map(l=>`<tr><td>${esc(l.created_at.slice(0,10))}</td><td>${esc(l.type)}</td><td class="${num(l.minutes)<0?'error-text':'success-text'}">${num(l.minutes)>0?'+':''}${fmt(Math.abs(num(l.minutes)))}</td><td>${esc(l.note||'')}</td></tr>`).join('')||'<tr><td colspan="4">ไม่มีรายการ</td></tr>'}</tbody></table></div><p class="helper mt12">รายการ Attendance ของคอร์สนี้ ${attends.length} รายการ สามารถดูรายละเอียดคาบเรียนในหน้า Review & History</p>`,`${btn('ปิด','close-modal')}`,true);}
function sessionDetail(id){const s=byId('Sessions',id);if(!s)return;const aa=all('Attendance').filter(a=>a.session_id===id);modal('Session Details',`<div class="kv"><span>วันที่เรียน</span><strong>${esc(s.date)}</strong><span>เวลา</span><strong>${esc(s.start_time)}–${esc(s.end_time)}</strong><span>แหล่งเวลา</span><strong>${esc(s.time_source)}</strong><span>ติวเตอร์</span><strong>${esc(s.tutor)}</strong><span>สถานะ</span><strong>${esc(s.status)}</strong><span>ไฟล์ต้นฉบับ</span><strong>${esc(s.source_file||'-')}</strong><span>หมายเหตุ</span><strong>${esc(s.notes||'-')}</strong></div><h3 class="panel-title mt20">Attendance & Deduction</h3><div class="table-wrap mt12"><table><thead><tr><th>STUDENT</th><th>COURSE</th><th>ACTUAL</th><th>DEDUCT</th><th>ACTION</th></tr></thead><tbody>${aa.map(a=>`<tr><td>${esc(studentName(a.student_id))}</td><td>${esc(courseTitle(a.course_id))}</td><td>${fmt(a.actual_minutes)}</td><td>${fmt(a.deduct_minutes)}</td><td>${s.status!=='cancelled'?btnInline('แก้ไข','edit-attendance',a.id):'-'}</td></tr>`).join('')}</tbody></table></div>`,`${s.status==='pending'?btnInline('Approve & Deduct','approve-session',s.id):''}${s.status!=='cancelled'?btnInline('ยกเลิกคาบ','cancel-session',s.id):''}<button class="btn" data-close>ปิด</button>`,true);}
function editAttendance(id){const a=byId('Attendance',id);if(!a)return;const s=byId('Sessions',a.session_id);if(!s||s.status==='cancelled')return;modal('แก้ไขการตัดชั่วโมง',`<form id="edit-att-form" class="form"><input type="hidden" name="id" value="${esc(id)}"><div class="note">${esc(studentName(a.student_id))} · ${esc(courseTitle(a.course_id))}<br>หากคาบนี้ได้รับอนุมัติแล้ว ระบบจะเพิ่มรายการปรับส่วนต่างลง Hour Ledger โดยไม่ลบรายการเดิม</div><div class="grid-2">${field('edit-join','เวลาเข้า','time',a.join_time)}${field('edit-leave','เวลาออก','time',a.leave_time)}</div>${field('edit-actual','เวลาที่เข้าร่วมจริง (นาที)','number',a.actual_minutes,'min="0" max="1440"')}${field('edit-minutes','เวลาที่ต้องตัด (นาที)','number',a.deduct_minutes,'min="0" max="1440" required')}${field('edit-reason','เหตุผลในการแก้ไข','text','','required')}<button class="btn primary" type="submit">บันทึกและปรับยอดชั่วโมง</button></form>`);}
async function onSubmit(e){const f=e.target,formId=f.getAttribute('id');if(!['student-form','course-form','renew-form','topup-form','group-form','manual-form','edit-att-form','schedule-form','adjust-form','alias-form','rule-form','policy-form'].includes(formId))return;e.preventDefault();if(state.busy)return;try{if(formId==='alias-form')await saveAlias(f);if(formId==='rule-form')await saveRule(f);if(formId==='policy-form')await savePolicy(f);if(formId==='student-form')await saveStudent(f);if(formId==='course-form')await saveCourse(f);if(formId==='renew-form')await renewCourse(f);if(formId==='topup-form')await topupCourse(f);if(formId==='group-form')await saveGroup(f);if(formId==='schedule-form')await saveSchedule(f);if(formId==='adjust-form')await saveAdjustment(f);if(formId==='manual-form')previewManual(f);if(formId==='edit-att-form')await saveEditAttendance(f);}catch(err){notice(err);}}
async function saveStudent(f){
  const id=inputVal(f,'id'),name=inputVal(f,'student-name');if(!name)throw Error('กรุณากรอกชื่อนักเรียน');
  const previous=byId('Students',id);
  const s={...previous,id:id||uuid(),name,email:inputVal(f,'student-email'),aliases:inputVal(f,'student-aliases'),status:inputVal(f,'student-status')||'active',created_at:previous?.created_at||now(),notes:inputVal(f,'student-notes'),full_name:inputVal(f,'student-fullname'),school:inputVal(f,'student-school'),grade_level:inputVal(f,'student-grade'),academic_year:inputVal(f,'student-academic-year'),updated_at:now()};
  const changed=!!previous&&['school','grade_level','academic_year'].some(k=>(previous[k]||'')!==(s[k]||''));
  const history=changed?[{id:uuid(),student_id:s.id,old_school:previous.school||'',old_grade_level:previous.grade_level||'',old_academic_year:previous.academic_year||'',new_school:s.school,new_grade_level:s.grade_level,new_academic_year:s.academic_year,changed_at:now()}]:[];
  const changes=id?{update:{Students:[s]},add:{Audit:[saveAudit('student_updated',s.id,{name,education_changed:changed})],StudentEducationHistory:history}}:{add:{Students:[s],Audit:[saveAudit('student_created',s.id,{name})]}};
  await commit(changes);state.studentId=s.id;state.view='students';closeModal();render();toast('บันทึกนักเรียนเรียบร้อย');
}
async function deleteStudent(id){
  const student=byId('Students',id);
  if(!student||student.status==='deleted')throw Error('ไม่พบนักเรียนที่ต้องการลบ');
  const pending=all('Attendance').filter(a=>a.student_id===id&&byId('Sessions',a.session_id)?.status==='pending');
  if(pending.length)throw Error(`นักเรียนมี ${pending.length} รายการที่รออนุมัติ กรุณาอนุมัติหรือยกเลิกคาบก่อนลบ`);
  const schedules=all('Schedules').filter(x=>x.student_id===id&&x.status==='active');
  if(!confirm(`ย้าย “${student.name}” ไปถังขยะ?\n\nคอร์สและประวัติการเรียนจะไม่ถูกลบ และกู้คืนได้ภายหลัง${schedules.length?`\nระบบจะยกเลิกตารางเรียนเดี่ยวที่ยังทำงานอยู่ ${schedules.length} รายการ`:''}`))return;
  const groups=all('Groups').filter(g=>(g.member_ids||'').split('|').includes(id));
  const changes={update:{Students:[{...student,status:'deleted'}]},add:{Audit:[saveAudit('student_trashed',id,{name:student.name,groups_removed:groups.map(g=>g.id),schedules_cancelled:schedules.map(x=>x.id)})]}};
  if(groups.length){changes.update.Groups=groups.map(g=>({...g,member_ids:(g.member_ids||'').split('|').filter(x=>x&&x!==id).join('|')}));
    const leave=all('GroupMemberships').filter(x=>x.student_id===id&&x.status==='active');
    if(leave.length)changes.update.GroupMemberships=leave.map(x=>({...x,status:'left',left_at:dateNow()}));
  }
  if(schedules.length)changes.update.Schedules=schedules.map(x=>({...x,status:'cancelled'}));
  await commit(changes);if(state.studentId===id)state.studentId='';render();toast('ย้ายนักเรียนไปถังขยะแล้ว (เรียกคืนได้)');
}
async function restoreStudent(id){
  const student=byId('Students',id);
  if(!student||student.status!=='deleted')throw Error('ไม่พบนักเรียนในถังขยะ');
  await commit({update:{Students:[{...student,status:'active'}]},add:{Audit:[saveAudit('student_restored',id,{name:student.name})]}});
  state.showDeleted=false;state.studentId=id;render();toast('กู้คืนนักเรียนแล้ว · หากเคยอยู่ในกลุ่มให้เพิ่มกลับเข้ากลุ่มตามต้องการ');
}

async function saveCourse(f){const studentId=inputVal(f,'course-student'),title=inputVal(f,'course-title'),date=inputVal(f,'course-date'),mins=Math.round(Number(inputVal(f,'course-hours'))*60);if(!byId('Students',studentId)||!title||!dateValid(date)||!Number.isFinite(mins)||mins<=0)throw Error('กรอกข้อมูลคอร์สให้ครบและชั่วโมงต้องมากกว่า 0');const cycle=Math.max(0,...coursesOf(studentId).filter(c=>norm(c.title)===norm(title)).map(c=>num(c.cycle_no)))+1;const c={id:uuid(),student_id:studentId,title,cycle_no:cycle,start_date:date,purchased_minutes:mins,status:'active',previous_course_id:'',created_at:now(),closed_at:''};const l={id:uuid(),student_id:studentId,course_id:c.id,session_id:'',type:'purchase',minutes:mins,note:'สร้างคอร์สใหม่',created_at:now()};await commit({add:{Courses:[c],Ledger:[l],Audit:[saveAudit('course_created',c.id,{mins})]}});state.studentId=studentId;state.view='students';closeModal();render();toast('เพิ่มคอร์สแล้ว');}
async function renewCourse(f){const old=byId('Courses',inputVal(f,'old_id'));if(!old||old.status!=='active')throw Error('คอร์สเก่าไม่สามารถต่อได้');const date=inputVal(f,'renew-date'),title=inputVal(f,'renew-title'),mins=Math.round(Number(inputVal(f,'renew-hours'))*60),policy=inputVal(f,'renew-policy'),oldBalance=balance(old.id);if(!title||!dateValid(date)||!Number.isFinite(mins)||mins<0)throw Error('ข้อมูลคอร์สใหม่ไม่ถูกต้อง');if(mins===0&&oldBalance===0)throw Error('ไม่มีชั่วโมงใหม่หรือยอดยกมา');const cycle=Math.max(0,...coursesOf(old.student_id).filter(c=>norm(c.title)===norm(title)).map(c=>num(c.cycle_no)))+1;const newC={id:uuid(),student_id:old.student_id,title,cycle_no:cycle,start_date:date,purchased_minutes:mins,status:'active',previous_course_id:old.id,created_at:now(),closed_at:''};const updated={...old,status:policy==='keep'?'held':'archived',closed_at:now()};const ledger=[],t=now();if(mins>0)ledger.push({id:uuid(),student_id:old.student_id,course_id:newC.id,session_id:'',type:'purchase',minutes:mins,note:'ต่อคอร์สจากรอบ '+old.cycle_no,created_at:t});if(oldBalance>0&&policy!=='keep'){ledger.push({id:uuid(),student_id:old.student_id,course_id:old.id,session_id:'',type:policy==='transfer'?'transfer_out':'close_out',minutes:-oldBalance,note:policy==='transfer'?'ยกยอดไปคอร์สรอบ '+cycle:'ปิดยอดคอร์สเก่า',created_at:t});if(policy==='transfer')ledger.push({id:uuid(),student_id:old.student_id,course_id:newC.id,session_id:'',type:'transfer_in',minutes:oldBalance,note:'ยกยอดจากรอบ '+old.cycle_no,created_at:t});}await commit({update:{Courses:[updated]},add:{Courses:[newC],Ledger:ledger,Audit:[saveAudit('course_renewed',newC.id,{previous:old.id,policy,carried:oldBalance,newMinutes:mins})]}});state.studentId=old.student_id;state.view='students';closeModal();render();toast('ต่อคอร์สแล้ว ประวัติรอบเก่ายังอยู่');}
async function topupCourse(f){const c=byId('Courses',inputVal(f,'course_id')),mins=Math.round(Number(inputVal(f,'topup-hours'))*60);if(!c||!Number.isFinite(mins)||mins<=0)throw Error('ชั่วโมงที่เพิ่มไม่ถูกต้อง');await commit({update:{Courses:[{...c,purchased_minutes:num(c.purchased_minutes)+mins}]},add:{Ledger:[{id:uuid(),student_id:c.student_id,course_id:c.id,session_id:'',type:'purchase',minutes:mins,note:inputVal(f,'topup-note'),created_at:now()}],Audit:[saveAudit('course_topup',c.id,{mins})]}});closeModal();toast('เติมชั่วโมงเรียบร้อย');}
async function saveGroup(f){
  const id=inputVal(f,'id'),name=inputVal(f,'group-name'),members=[...f.querySelectorAll('input[name=member]:checked')].map(x=>x.value);
  if(!name)throw Error('กรุณากรอกชื่อกลุ่ม');
  const gid=id||uuid(),old=byId('Groups',id),before=new Set((old?.member_ids||'').split('|').filter(Boolean)),after=new Set(members),t=now();
  const added=members.filter(x=>!before.has(x)),removed=[...before].filter(x=>!after.has(x));
  const updateRows=[],history=[];
  for(const studentId of removed){const current=all('GroupMemberships').find(x=>x.group_id===gid&&x.student_id===studentId&&x.status==='active');if(current)updateRows.push({...current,status:'left',left_at:dateNow()});else history.push({id:uuid(),group_id:gid,student_id:studentId,joined_at:old?.created_at?.slice(0,10)||dateNow(),left_at:dateNow(),status:'left',created_at:t});}
  for(const studentId of added)history.push({id:uuid(),group_id:gid,student_id:studentId,joined_at:dateNow(),left_at:'',status:'active',created_at:t});
  // Backfill existing group members only if no membership record has ever been created.
  for(const studentId of members.filter(x=>before.has(x))){if(!all('GroupMemberships').some(m=>m.group_id===gid&&m.student_id===studentId&&m.status==='active'))history.push({id:uuid(),group_id:gid,student_id:studentId,joined_at:old?.created_at?.slice(0,10)||dateNow(),left_at:'',status:'active',created_at:t});}
  const g={id:gid,name,member_ids:members.join('|'),created_at:old?.created_at||t};
  const changes={add:{GroupMemberships:history,Audit:[saveAudit(id?'group_updated':'group_created',gid,{added,removed})]},update:{}};
  if(id)changes.update.Groups=[g];else changes.add.Groups=[g];
  if(updateRows.length)changes.update.GroupMemberships=updateRows;
  await commit(changes);closeModal();toast('บันทึกกลุ่มและประวัติสมาชิกเรียบร้อย');
}
function groupMembershipHistory(id){const g=byId('Groups',id);if(!g)return;const rows=all('GroupMemberships').filter(m=>m.group_id===id).sort((a,b)=>b.created_at.localeCompare(a.created_at));modal('ประวัติสมาชิก · '+g.name,`<div class="table-wrap"><table><thead><tr><th>นักเรียน</th><th>วันที่เข้า</th><th>วันที่ออก</th><th>สถานะ</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${esc(studentName(m.student_id))}</td><td>${esc(m.joined_at)}</td><td>${esc(m.left_at||'—')}</td><td>${pill(m.status,m.status==='active'?'green':'')}</td></tr>`).join('')||'<tr><td colspan="4">ยังไม่มีข้อมูลประวัติสมาชิก</td></tr>'}</tbody></table></div>`, '',true);}
function openGroupRule(id){const g=byId('Groups',id),r=ruleFor('group',id);if(!g)return;modal('ตั้งค่าการตัดชั่วโมง · '+g.name,`<form class="form" id="rule-form"><input type="hidden" name="rule-scope" value="group"><input type="hidden" name="rule-id" value="${esc(id)}">${selectField('rule-basis','เวลาอ้างอิงเริ่มต้น',`<option value="tutor" ${r?.basis==='tutor'?'selected':''}>ติวเตอร์</option><option value="student" ${r?.basis==='student'?'selected':''}>นักเรียนรายคน</option><option value="overlap" ${r?.basis==='overlap'?'selected':''}>เวลาที่อยู่พร้อมกัน</option>`)}${selectField('rule-rounding','การปัดเวลา',`<option value="1" ${!r||num(r.rounding_minutes)===1?'selected':''}>ตามนาทีจริง</option><option value="5" ${num(r?.rounding_minutes)===5?'selected':''}>ปัดขึ้นทุก 5 นาที</option><option value="15" ${num(r?.rounding_minutes)===15?'selected':''}>ปัดขึ้นทุก 15 นาที</option><option value="30" ${num(r?.rounding_minutes)===30?'selected':''}>ปัดขึ้นทุก 30 นาที</option>`)}${field('rule-min','ขั้นต่ำต่อคาบ (นาที)','number',r?.minimum_minutes||0,'min="0" max="720"')}<div class="note">กติกานี้เป็นค่าเริ่มต้นสำหรับคาบใหม่เท่านั้น ไม่เปลี่ยนรายการที่ผ่านมา</div><button class="btn primary" type="submit">บันทึกกติกา</button></form>`);}
async function saveRule(f){const scope=inputVal(f,'rule-scope'),id=inputVal(f,'rule-id'),r=ruleFor(scope,id),base={id:r?.id||uuid(),scope_type:scope,scope_id:id,basis:inputVal(f,'rule-basis'),rounding_minutes:Number(inputVal(f,'rule-rounding')),minimum_minutes:Number(inputVal(f,'rule-min')),updated_at:now()};if(![1,5,15,30].includes(base.rounding_minutes)||!Number.isInteger(base.minimum_minutes)||base.minimum_minutes<0||base.minimum_minutes>720)throw Error('กติกาการตัดชั่วโมงไม่ถูกต้อง');await commit(r?{update:{ClassRules:[base]},add:{Audit:[saveAudit('class_rule_changed',id,base)]}}:{add:{ClassRules:[base],Audit:[saveAudit('class_rule_changed',id,base)]}});closeModal();toast('บันทึกกติกาเริ่มต้นแล้ว');}
function openCoursePolicy(courseId){const c=byId('Courses',courseId),p=coursePolicy(courseId);if(!c)return;modal('วันหมดอายุและการยกยอด · '+c.title,`<form id="policy-form" class="form"><input type="hidden" name="policy-course" value="${esc(courseId)}">${field('policy-expiry','วันหมดอายุ (เว้นว่างคือไม่หมดอายุ)','date',p?.expires_on||'')}${selectField('policy-rollover','วิธีจัดการที่แนะนำเมื่อต่อคอร์ส',`<option value="transfer" ${p?.rollover_policy!=='keep'&&p?.rollover_policy!=='close'?'selected':''}>ยกยอดไปคอร์สใหม่</option><option value="keep" ${p?.rollover_policy==='keep'?'selected':''}>เก็บยอดเดิมไว้ใช้</option><option value="close" ${p?.rollover_policy==='close'?'selected':''}>ปิดยอดเดิม</option>`)}<button class="btn primary" type="submit">บันทึก</button></form>`);}
async function savePolicy(f){const cid=inputVal(f,'policy-course'),c=byId('Courses',cid),old=coursePolicy(cid);if(!c)throw Error('ไม่พบคอร์ส');const expiry=inputVal(f,'policy-expiry');if(expiry&&!dateValid(expiry))throw Error('วันหมดอายุไม่ถูกต้อง');const item={id:old?.id||uuid(),course_id:cid,expires_on:expiry,rollover_policy:inputVal(f,'policy-rollover'),updated_at:now()};await commit(old?{update:{CoursePolicies:[item]},add:{Audit:[saveAudit('course_policy_changed',cid,{expiry})]}}:{add:{CoursePolicies:[item],Audit:[saveAudit('course_policy_changed',cid,{expiry})]}});closeModal();toast('บันทึกเงื่อนไขคอร์สแล้ว');}

async function saveManual(f){const date=inputVal(f,'class_date'),start=inputVal(f,'class_start'),end=inputVal(f,'class_end'),dur=duration(start,end);if(!dateValid(date)||!Number.isFinite(dur)||dur<=0||dur>720)throw Error('วัน/เวลาไม่ถูกต้อง (หนึ่งคาบต้องไม่เกิน 12 ชั่วโมง)');const basis=inputVal(f,'deduction_mode');let mins=basis==='custom'?Number(inputVal(f,'class_custom')):dur;if(!Number.isFinite(mins)||mins<0||mins>720)throw Error('นาทีที่ตัดต้องอยู่ระหว่าง 0–720');mins=basis==='custom'?Math.round(mins):adjustedByRule(mins,ruleFor('group',inputVal(f,'group_id')));if(mins>720)throw Error('นาทีหลังปัดเกิน 720');const students=[...f.querySelectorAll('input[name=participant]:checked')].map(x=>x.value);if(!students.length)throw Error('กรุณาเลือกนักเรียนอย่างน้อยหนึ่งคน');const courseIds=students.map(studentId=>{const select=f.querySelector(`select.manual-course[data-student="${CSS.escape(studentId)}"]`);const course=byId('Courses',select?.value);if(!course||course.student_id!==studentId||!['active','held'].includes(course.status))throw Error('กรุณาเลือกคอร์สที่ใช้งานได้ของ '+studentName(studentId));if(coursePolicy(course.id)?.expires_on&&date>coursePolicy(course.id).expires_on)throw Error('คอร์สของ '+studentName(studentId)+' หมดอายุแล้ว');return course.id;});const t=now(),sid=uuid();const s={id:sid,date,start_time:start,end_time:end,mode:'manual',group_id:inputVal(f,'group_id'),tutor:inputVal(f,'tutor'),time_source:basis,status:'pending',source_file:'',notes:inputVal(f,'class_notes'),created_at:t};const aa=students.map((id,i)=>{const raw=f.querySelector(`input.manual-minute[data-student="${CSS.escape(id)}"]`)?.value;const custom=(raw===undefined||raw==='')?mins:Number(raw);if(!Number.isInteger(custom)||custom<0||custom>720)throw Error('นาทีที่กำหนดให้ '+studentName(id)+' ไม่ถูกต้อง');return {id:uuid(),session_id:sid,student_id:id,course_id:courseIds[i],join_time:start,leave_time:end,actual_minutes:dur,deduct_minutes:custom,status:'pending',source_name:'',created_at:t};});await commit({add:{Sessions:[s],Attendance:aa,Audit:[saveAudit('manual_session_created',sid,{count:aa.length})]}});state.view='reviews';toast('ลงเวลาแล้ว รอการอนุมัติตัดชั่วโมง');}
async function approveSessions(ids){
  const {sessions,aa}=buildApproval(ids),t=now();
  const ledger=aa.filter(a=>num(a.deduct_minutes)>0).map(a=>({id:uuid(),student_id:a.student_id,course_id:a.course_id,session_id:a.session_id,type:'deduct',minutes:-num(a.deduct_minutes),note:'Approved session '+byId('Sessions',a.session_id).date,created_at:t}));
  await commit({update:{Sessions:sessions.map(s=>({...s,status:'approved'})),Attendance:aa.map(a=>({...a,status:'approved'}))},add:{Ledger:ledger,Audit:[saveAudit('sessions_bulk_approved',sessions.map(s=>s.id).join('|'),{sessions:sessions.length,people:aa.length,totalMinutes:ledger.reduce((v,x)=>v-x.minutes,0)})]}});
  state.reviewSelection=[];closeModal();toast('อนุมัติ '+sessions.length+' คาบ · ตัดชั่วโมง '+nice(ledger.reduce((v,x)=>v-x.minutes,0))+' เรียบร้อย');
}
async function approveSession(id){return approveSessions([id]);}
async function cancelSession(id){const s=byId('Sessions',id);if(!s||s.status==='cancelled')throw Error('คาบนี้ถูกยกเลิกแล้ว');if(!confirm(`ยืนยันยกเลิกคาบ ${s.date}? ${s.status==='approved'?'ระบบจะคืนชั่วโมงให้ทุกคน':''}`))return;const aa=all('Attendance').filter(a=>a.session_id===id),t=now();const ledger=s.status==='approved'?aa.filter(a=>num(a.deduct_minutes)>0).map(a=>({id:uuid(),student_id:a.student_id,course_id:a.course_id,session_id:id,type:'refund',minutes:num(a.deduct_minutes),note:'Refund cancelled session',created_at:t})):[];await commit({update:{Sessions:[{...s,status:'cancelled'}],Attendance:aa.map(a=>({...a,status:'cancelled'}))},add:{Ledger:ledger,Audit:[saveAudit('session_cancelled',id,{refund:ledger.reduce((a,b)=>a+num(b.minutes),0)})]}});closeModal();toast('ยกเลิกคาบและปรับยอดแล้ว');}
async function saveEditAttendance(f){const a=byId('Attendance',inputVal(f,'id'));if(!a)throw Error('ไม่พบรายการ');const session=byId('Sessions',a.session_id);if(!session||session.status==='cancelled')throw Error('ไม่สามารถแก้ไขคาบที่ยกเลิก');const minutes=Number(inputVal(f,'edit-minutes')),actual=Number(inputVal(f,'edit-actual')),reason=inputVal(f,'edit-reason');if(!reason||!Number.isInteger(minutes)||minutes<0||minutes>720||!Number.isInteger(actual)||actual<0||actual>1440)throw Error('กรุณาระบุเหตุผลและนาทีที่ถูกต้อง');const delta=num(a.deduct_minutes)-minutes;if(session.status==='approved'&&delta<0&&balance(a.course_id)<-delta)throw Error('ชั่วโมงคงเหลือไม่พอสำหรับปรับเพิ่ม');const updated={...a,join_time:inputVal(f,'edit-join'),leave_time:inputVal(f,'edit-leave'),actual_minutes:actual,deduct_minutes:minutes};const ledger=delta&&session.status==='approved'?[{id:uuid(),student_id:a.student_id,course_id:a.course_id,session_id:a.session_id,type:'adjustment',minutes:delta,note:reason,created_at:now()}]:[];await commit({update:{Attendance:[updated]},add:{Ledger:ledger,Audit:[saveAudit('attendance_edited',a.id,{old:a.deduct_minutes,new:minutes,reason,actual})]}});closeModal();toast('แก้ไขและปรับยอดแล้ว');}
function parseTimeCell(value){let s=String(value??'').trim();const hh=s.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?/i);if(hh){let h=+hh[1];if(hh[3]){if(h===12)h=0;if(hh[3].toUpperCase()==='PM')h+=12;}if(h<24&&+hh[2]<60)return String(h).padStart(2,'0')+':'+hh[2];}if(/^0\.\d+$/.test(s)){const mins=Math.round(Number(s)*1440);return `${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;}return '';}
function mergeSegments(segments){const ordered=segments.filter(s=>Number.isFinite(s[0])&&Number.isFinite(s[1])&&s[1]>s[0]).sort((a,b)=>a[0]-b[0]);const merged=[];for(const [start,end] of ordered){const last=merged[merged.length-1];if(last&&start<=last[1])last[1]=Math.max(last[1],end);else merged.push([start,end]);}return merged;}
async function parseExcelFile(file){if(!window.XLSX)throw Error('ไม่สามารถโหลด XLSX parser ได้ โปรดเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่');const buffer=await file.arrayBuffer();let fingerprint='';if(crypto.subtle){const hashed=await crypto.subtle.digest('SHA-256',buffer);fingerprint=[...new Uint8Array(hashed)].map(n=>n.toString(16).padStart(2,'0')).join('');}else fingerprint=[...new Uint8Array(buffer)].reduce((h,b)=>((h*31)^b)>>>0,2166136261).toString(16)+'-'+file.size;const wb=XLSX.read(buffer,{type:'array',cellDates:false});const sheet=wb.Sheets[wb.SheetNames[0]];if(!sheet)throw Error('ไฟล์นี้ไม่พบชีตข้อมูล');const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});const headers=(rows[0]||[]).map(v=>norm(v));const column={first:headers.findIndex(v=>v==='ชื่อ'||v==='first name'),last:headers.findIndex(v=>v==='นามสกุล'||v==='last name'),email:headers.findIndex(v=>v==='อีเมล'||v==='email'),duration:headers.findIndex(v=>v==='ระยะเวลา'||v==='duration'),join:headers.findIndex(v=>v.includes('เวลาที่เข้าร่วม')||v.includes('join time')),leave:headers.findIndex(v=>v.includes('เวลาที่ออก')||v.includes('leave time'))};if(column.first<0||column.join<0||column.leave<0)throw Error('ไม่พบหัวคอลัมน์ ชื่อ / เวลาที่เข้าร่วม / เวลาที่ออก ใน '+file.name);const persons=new Map();for(const cells of rows.slice(1)){const name=[column.first>=0?cells[column.first]:'',column.last>=0?cells[column.last]:''].map(x=>String(x||'').trim()).filter(Boolean).join(' ');if(!name)continue;const email=String(cells[column.email]||'').trim();const join=parseTimeCell(cells[column.join]),leave=parseTimeCell(cells[column.leave]);const key=norm(name+'|'+email);if(!persons.has(key))persons.set(key,{name,email,segments:[],rawDuration:0});const p=persons.get(key);if(join&&leave){const a=minutesOf(join);let b=minutesOf(leave);if(b<a)b+=1440;if(b>a)p.segments.push([a,b]);}const d=String(cells[column.duration]||'');const m=d.match(/(?:(\d+)\s*ชม\.?\s*)?(?:(\d+)\s*นาที)?/);const minutes=m&&m[0]?num(m[1])*60+num(m[2]):0;p.rawDuration+=minutes;}
 const people=[...persons.values()].map(p=>{p.segments=mergeSegments(p.segments);p.actual=p.segments.length?p.segments.reduce((n,s)=>n+s[1]-s[0],0):p.rawDuration;p.join=p.segments.length?timeOfMin(p.segments[0][0]):'';p.leave=p.segments.length?timeOfMin(p.segments[p.segments.length-1][1]):'';const match=resolveMeetIdentity(p.name,p.email);p.studentId=match.studentId;p.matchLevel=match.level;p.matchReason=match.reason;p.courseId=match.studentId?proposedCourse(match.studentId,'private','')?.id||'':'';p.include=!!match.studentId;p.remember=false;p.classChoice='private';p.variants=[{name:p.name,email:p.email}];p.manualMinutes=null;return p;});
  // A learner may join with several devices / Meet display names in one report.
  // Merge recognized student IDs and their unioned time segments before billing.
  const consolidated=[];for(const p of people){const existing=p.studentId?consolidated.find(x=>x.studentId===p.studentId):null;if(!existing){consolidated.push(p);continue;}existing.variants.push(...p.variants);existing.segments=mergeSegments([...existing.segments,...p.segments]);existing.actual=existing.segments.length?existing.segments.reduce((n,x)=>n+x[1]-x[0],0):Math.max(existing.actual,p.actual);existing.join=existing.segments.length?timeOfMin(existing.segments[0][0]):existing.join;existing.leave=existing.segments.length?timeOfMin(existing.segments[existing.segments.length-1][1]):existing.leave;existing.matchReason+=' · รวม '+existing.variants.length+' ชื่อ/อุปกรณ์';}
  people.splice(0,people.length,...consolidated);if(!people.length)throw Error('ไม่พบข้อมูลผู้เข้าร่วมในไฟล์');const dateInfo=detectReportDate(rows,column,file.name);const date=dateInfo.date;const tutorIndex=Math.max(0,people.findIndex(p=>/suthawarin|tutor|teacher|ติวเตอร์|ครู/i.test(p.name)));people[tutorIndex].include=false;return {filename:file.name,fingerprint,date,dateSource:dateInfo.source,dateConflict:dateInfo.conflict,dateNotes:dateInfo.notes,people,tutorIndex,sourceIndex:tutorIndex,basis:'tutor',groupId:'',classType:'private',split:false};}
// Prefer an explicit date within the Excel report; use filename only as fallback.
function isoReportDate(value){
  const s=String(value??'').trim();if(!s)return '';
  const ymd=s.match(/(?:^|\D)((?:19|20|25)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?=\D|$)/);
  const dmy=s.match(/(?:^|\D)(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20|25)\d{2})(?=\D|$)/);
  let y,m,d;
  if(ymd)[,y,m,d]=ymd;
  else if(dmy)[,d,m,y]=dmy;
  else return '';
  y=Number(y);m=Number(m);d=Number(d);if(y>=2400)y-=543;
  if(y<1900||y>2100||m<1||m>12||d<1||d>31)return '';
  const out=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const dt=new Date(out+'T00:00:00Z');return !Number.isNaN(dt.getTime())&&dt.toISOString().slice(0,10)===out?out:'';
}
function detectReportDate(rows,column,filename){
  const head=(rows[0]||[]).map(x=>norm(x));
  const idx=head.map((h,i)=>(/^(วันที่|date|meeting date|session date|วันที่เรียน)$/.test(h)?i:-1)).filter(i=>i>=0);
  const found=[];
  for(const cells of rows.slice(1)){
    for(const k of [...idx,column.join,column.leave])if(k>=0){const d=isoReportDate(cells[k]);if(d)found.push(d);}
  }
  const unique=[...new Set(found)],nameDate=isoReportDate(filename);
  if(unique.length){const sorted=unique.sort();return {date:sorted[0],source:'excel',conflict:unique.length>1||(!!nameDate&&!unique.includes(nameDate)),notes:unique.length>1?'มีหลายวันที่ใน Excel: '+unique.join(', '):nameDate&&nameDate!==sorted[0]?'วันที่ Excel ไม่ตรงกับชื่อไฟล์ '+nameDate:''};}
  return {date:nameDate||'',source:nameDate?'filename':'missing',conflict:false,notes:nameDate?'':'ไม่พบวันที่ในไฟล์หรือชื่อไฟล์ ต้องเลือกวันที่เองก่อนบันทึก'};
}
function reportClock(d){
  if(!d)return {start:'',end:'',minutes:0,origin:'unknown'};
  const tutor=d.people[d.tutorIndex];
  const segments=tutor?.segments?.length?tutor.segments:mergeSegments(d.people.flatMap(p=>p.segments||[]));
  if(!segments.length)return {start:'',end:'',minutes:0,origin:'missing'};
  const start=Math.min(...segments.map(x=>x[0])),end=Math.max(...segments.map(x=>x[1]));
  return {start:timeOfMin(start),end:timeOfMin(end),minutes:segments.reduce((a,b)=>a+b[1]-b[0],0),origin:tutor?.segments?.length?'tutor':'participants'};
}
function reportStatus(d,index){
  if(state.importDone[index]==='saved')return {tone:'green',label:'บันทึก Pending แล้ว'};
  if(state.importDone[index]==='skipped')return {tone:'',label:'ข้าม'};
  if(!d)return {tone:'red',label:state.importErrors[index]||'อ่านไม่ได้'};
  if(all('Imports').some(x=>x.fingerprint===d.fingerprint)||state.importDrafts.some((x,i)=>i<index&&x?.fingerprint===d.fingerprint))return {tone:'red',label:'ไฟล์ซ้ำ'};
  if(!dateValid(d.date)||d.dateConflict)return {tone:'gold',label:'ตรวจสอบวันที่'};
  if(d.people.filter((p,i)=>i!==d.tutorIndex&&p.include).some(p=>!p.studentId||p.matchLevel==='conflict'))return {tone:'gold',label:'ตรวจชื่อ'};
  if(!d.people.some((p,i)=>i!==d.tutorIndex))return {tone:'gold',label:'ไม่มีนักเรียน'};
  return {tone:'green',label:'พร้อมตรวจ'};
}
function timeOfMin(m){m=(m%1440+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function isSupportedMeetFile(file){return /\.(xlsx|xls|csv)$/i.test(file?.name||'') && (!file.size||file.size<=10*1024*1024);}
async function onFileDrag(e){
  // A user can drop several Excel files anywhere on the Import page, not only on the dashed area.
  if(state.view!=='import'||['needs_login','setup_required'].includes(state.mode))return;
  const hasFiles=!!e.dataTransfer&&(Array.from(e.dataTransfer.types||[]).includes('Files')||!!e.dataTransfer.files?.length);
  if(!hasFiles)return;
  const zone=document.querySelector('#excel-dropzone');
  if(e.type==='dragenter'||e.type==='dragover'){
    e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy';zone?.classList.add('drag-active');return;
  }
  if(e.type==='dragleave'){
    if(!e.relatedTarget||!document.documentElement.contains(e.relatedTarget))zone?.classList.remove('drag-active');return;
  }
  if(e.type==='drop'){
    e.preventDefault();zone?.classList.remove('drag-active');
    await prepareImportBatch([...e.dataTransfer.files]);
  }
}
async function prepareImportBatch(files){
  if(state.importLoading){toast('กำลังอ่านชุดไฟล์ก่อนหน้า กรุณาตรวจสอบเมื่อเสร็จ',true);return;}
  if(!files.length)return;
  const valid=files.filter(isSupportedMeetFile),rejected=files.filter(f=>!isSupportedMeetFile(f));
  if(rejected.length)toast(`ข้าม ${rejected.length} ไฟล์ (ชนิดไม่รองรับหรือใหญ่เกิน 10 MB)`,true);
  if(!valid.length)return;
  if(state.importQueue.length+valid.length>50){toast('เก็บไฟล์ในชุดตรวจสอบได้สูงสุด 50 ไฟล์ กรุณาบันทึกหรือเคลียร์ชุดก่อน',true);return;}
  state.importLoading=true;
  const before=state.importQueue.length,existingHashes=new Set(state.importDrafts.filter(Boolean).map(d=>d.fingerprint));
  state.importQueue.push(...valid);state.importDrafts.push(...valid.map(()=>null));state.importErrors.push(...valid.map(()=>''));state.importDone.push(...valid.map(()=>''));
  let read=0,duplicates=0,failed=0;
  function progress(){const el=document.getElementById('import-upload-progress');if(el){el.hidden=false;el.textContent=`กำลังอ่านไฟล์ ${read}/${valid.length} · ซ้ำ ${duplicates} · อ่านไม่ได้ ${failed}`;}}
  render();progress();
  try{
    // Small parallel batches reduce memory spikes from multiple Excel workbooks.
    for(let offset=0;offset<valid.length;offset+=4){
      const slice=valid.slice(offset,offset+4);
      const results=await Promise.allSettled(slice.map(file=>parseExcelFile(file)));
      results.forEach((r,j)=>{
        const ix=before+offset+j;
        if(r.status==='fulfilled'){
          if(existingHashes.has(r.value.fingerprint)){state.importErrors[ix]='ไฟล์ซ้ำ: เนื้อหาเหมือนกับไฟล์ในชุดนี้';state.importDone[ix]='duplicate';duplicates++;}
          else{state.importDrafts[ix]=r.value;existingHashes.add(r.value.fingerprint);}
        }else{state.importErrors[ix]=r.reason?.message||String(r.reason);failed++;}
        read++;
      });
      progress();
    }
    const first=state.importDrafts.findIndex((d,i)=>d&&!state.importDone[i]);
    if(first>=0 && (!state.importDraft || !state.importDrafts[state.importIndex]))state.importIndex=first;
    loadCurrentImport();
    toast(`อ่านสำเร็จ ${valid.length-duplicates-failed} ไฟล์ · ซ้ำ ${duplicates} · ผิดพลาด ${failed}`,failed>0);
  }finally{state.importLoading=false;}
}
function loadCurrentImport(){
  if(!state.importQueue.length){state.importDraft=null;render();return;}
  state.importIndex=Math.max(0,Math.min(state.importIndex,state.importQueue.length-1));
  state.importDraft=state.importDrafts[state.importIndex]||null;render();
}
function stepImport(step,markSkipped=false){
  if(!state.importQueue.length)return;
  if(markSkipped&&!state.importDone[state.importIndex])state.importDone[state.importIndex]='skipped';
  const size=state.importQueue.length,first=state.importIndex;
  for(let offset=1;offset<=size;offset++){
    const i=(first+step*offset+size*offset)%size;
    if(state.importDrafts[i]&&!state.importDone[i]){state.importIndex=i;loadCurrentImport();return;}
  }
  // No remaining drafts: display status overview and keep batch until dismissed.
  state.importDraft=null;render();toast('ตรวจชุดไฟล์ครบแล้ว เปิดดูสถานะได้จากรายการด้านบน');
}

function duplicateAttendance(date,studentId,start,end){
  const st=minutesOf(start),en=minutesOf(end);if(!Number.isFinite(st)||!Number.isFinite(en))return null;const e=en<st?en+1440:en;
  for(const a of all('Attendance').filter(a=>a.student_id===studentId)){
    const existing=byId('Sessions',a.session_id);if(!existing||existing.status==='cancelled'||existing.date!==date)continue;
    const x=minutesOf(a.join_time||existing.start_time),y=minutesOf(a.leave_time||existing.end_time);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    const upper=y<x?y+1440:y;if(Math.max(st,x)<Math.min(e,upper))return existing;
  }
  return null;
}

function importBatchIndices(){return state.importDrafts.map((d,i)=>d&&!state.importDone[i]&&state.batchIncluded[i]!==false?i:-1).filter(i=>i>=0);}
function constructImportBatch(indices){
  if(!indices.length)throw Error('กรุณาเลือกไฟล์อย่างน้อยหนึ่งไฟล์');
  const usedFingerprints=new Set(all('Imports').map(x=>x.fingerprint)),reserved=[],sessions=[],attendance=[],imports=[],aliases=[],audit=[];
  for(const ix of [...new Set(indices)]){
    const d=state.importDrafts[ix];if(!d)throw Error('ไฟล์ '+(state.importQueue[ix]?.name||ix)+' ไม่พร้อมบันทึก');
    if(usedFingerprints.has(d.fingerprint))throw Error('ไฟล์ซ้ำหรือเคยนำเข้าแล้ว: '+d.filename);
    if(state.importDone[ix])throw Error('ไฟล์นี้ดำเนินการแล้ว: '+d.filename);
    usedFingerprints.add(d.fingerprint);
    if(!dateValid(d.date)||d.dateConflict)throw Error('กรุณาตรวจสอบและยืนยันวันที่เรียนของไฟล์ '+d.filename);
    if(!d.split&&d.classType==='group'&&!byId('Groups',d.groupId))throw Error('กรุณาเลือกกลุ่มของ '+d.filename);
    const tutor=d.people[d.tutorIndex],participants=d.people.filter((p,i)=>i!==d.tutorIndex&&p.include);
    if(!participants.length)throw Error('ไฟล์ '+d.filename+' ยังไม่ได้เลือกนักเรียน');
    const seen=new Set(),staged=[];
    for(const person of participants){
      if(!person.studentId||byId('Students',person.studentId)?.status!=='active')throw Error('กรุณาจับคู่ชื่อ Meet '+person.name+' ใน '+d.filename);
      if(seen.has(person.studentId))throw Error('นักเรียนคนเดิมปรากฏหลายแถวใน '+d.filename+' · '+studentName(person.studentId));
      seen.add(person.studentId);
      const gid=d.split?(person.classChoice==='private'?'':person.classChoice):d.classType==='group'?d.groupId:'';
      if(gid&&(!byId('Groups',gid)||!membersOf(gid).includes(person.studentId)))throw Error(studentName(person.studentId)+' ไม่อยู่ในกลุ่มที่เลือก');
      const course=byId('Courses',person.courseId);
      if(!course||course.student_id!==person.studentId||!['active','held'].includes(course.status))throw Error('คอร์สไม่ถูกต้อง: '+studentName(person.studentId));
      if(coursePolicy(course.id)?.expires_on&&d.date>coursePolicy(course.id).expires_on)throw Error('คอร์สหมดอายุ: '+studentName(person.studentId));
      const overlapping=duplicateAttendance(d.date,person.studentId,person.join,person.leave);
      if(overlapping)throw Error('พบเวลาซ้อนกับคาบเก่าของ '+studentName(person.studentId)+' '+d.date);
      const a=minutesOf(person.join),b=minutesOf(person.leave),last=b<a?b+1440:b;
      if(Number.isFinite(a)&&Number.isFinite(b)){
        if(reserved.some(x=>x.date===d.date&&x.studentId===person.studentId&&Math.max(x.start,a)<Math.min(x.end,last)))throw Error('พบเวลาซ้อนกันข้ามหลายไฟล์: '+studentName(person.studentId)+' '+d.date);
        reserved.push({date:d.date,studentId:person.studentId,start:a,end:last});
      }
      const val=person.manualMinutes===null?adjustedByRule(calculatedImport(d,person),ruleFor('group',gid)):Number(person.manualMinutes);
      if(!Number.isInteger(val)||val<0||val>720)throw Error('นาทีที่ตัดไม่ถูกต้อง: '+person.name);
      if(person.remember)for(const variant of person.variants||[{name:person.name,email:person.email}]){
        const conflict=aliasConflict(variant.name,variant.email,person.studentId);
        if(conflict)throw Error('ชื่อ Meet '+variant.name+' ถูกเชื่อมกับ '+conflict);
        const stagedConflict=aliases.find(x=>x.normalized_name===norm(variant.name)&&x.normalized_email===norm(variant.email)&&x.student_id!==person.studentId);
        if(stagedConflict)throw Error('ชื่อ Meet '+variant.name+' ถูกเลือกให้คนละนักเรียนในชุดไฟล์นี้');
        if(!aliasExists(variant.name,variant.email,person.studentId)&&!aliases.some(x=>x.student_id===person.studentId&&x.normalized_name===norm(variant.name)&&x.normalized_email===norm(variant.email)))aliases.push(aliasRow(person.studentId,variant.name,variant.email));
      }
      staged.push({person,gid,val});
    }
    const starts=d.people.flatMap(person=>person.segments.map(segment=>segment[0])),ends=d.people.flatMap(person=>person.segments.map(segment=>segment[1]));
    const st=tutor?.join||(starts.length?timeOfMin(Math.min(...starts)):'00:00'),en=tutor?.leave||(ends.length?timeOfMin(Math.max(...ends)):'00:00');
    const time=now(),classes=new Map(),sessionIds=[];
    for(const {person,gid,val} of staged){const key=d.split?(gid?'g:'+gid:'p:'+person.studentId):'whole';
      if(!classes.has(key)){const sid=uuid();classes.set(key,sid);sessionIds.push(sid);sessions.push({id:sid,date:d.date,start_time:st,end_time:en,mode:'excel',group_id:gid,tutor:tutor?.name||'',time_source:person.timeBasis||d.basis,status:'pending',source_file:d.filename,notes:d.split?'Split from Meet; pending review':'Imported from Meet; pending review',created_at:time});}
      attendance.push({id:uuid(),session_id:classes.get(key),student_id:person.studentId,course_id:person.courseId,join_time:person.join,leave_time:person.leave,actual_minutes:person.actual,deduct_minutes:val,status:'pending',source_name:person.name,created_at:time});
    }
    const imp={id:uuid(),fingerprint:d.fingerprint,filename:d.filename,date:d.date,session_id:sessionIds.join('|'),created_at:time};
    imports.push(imp);audit.push(saveAudit('excel_import',imp.id,{filename:d.filename,classDate:d.date,dateSource:d.dateSource,sessions:sessionIds.length,people:staged.length,bulkFiles:indices.length}));
  }
  return {sessions,attendance,imports,aliases,audit};
}
function previewImportBatch(){
  const indices=importBatchIndices();constructImportBatch(indices); // validate all files before showing confirmation
  const rows=indices.flatMap(i=>importRowsForSummary(state.importDrafts[i]));
  showSaveSummary('บันทึก Google Meet '+indices.length+' ไฟล์','pending',rows,()=>saveImports(indices),'บันทึกทุกไฟล์ที่เลือกในชุดเดียวเป็น Pending โดยยังไม่ตัดชั่วโมง');
}
async function saveImports(indices){
  const plan=constructImportBatch(indices);
  await commit({add:{Sessions:plan.sessions,Attendance:plan.attendance,Imports:plan.imports,MeetAliases:plan.aliases,Audit:plan.audit}});
  indices.forEach(i=>state.importDone[i]='saved');toast('บันทึก '+plan.imports.length+' ไฟล์ '+plan.attendance.length+' รายการ เป็น Pending เรียบร้อย');
  const next=state.importDrafts.findIndex((d,i)=>d&&!state.importDone[i]);
  if(next>=0){state.importIndex=next;loadCurrentImport();}else{state.importDraft=null;render();}
}
async function saveImport(){return saveImports([state.importIndex]);}

function downloadCSV(){const rows=[['วันที่','เวลาเริ่ม','เวลาสิ้นสุด','นักเรียน','คอร์ส','เข้าร่วมจริง (นาที)','ตัดชั่วโมง (นาที)','สถานะ','แหล่งข้อมูล']];for(const a of all('Attendance')){const s=byId('Sessions',a.session_id);rows.push([s?.date||'',s?.start_time||'',s?.end_time||'',studentName(a.student_id),courseTitle(a.course_id),num(a.actual_minutes),num(a.deduct_minutes),a.status,s?.source_file||'Manual']);}const csv='\ufeff'+rows.map(line=>line.map(cell=>{let v=String(cell??'');if(/^[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AreWarin-TutorOS-Report-'+dateNow()+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function printReport(){const sessions=sessionsSorted(),html=`<!DOCTYPE html><html lang="th"><meta charset="utf-8"><title>AreWarin Tutor OS Report</title><style>body{font:12px Arial,sans-serif;padding:35px;color:#193f30}h1{font-size:24px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #ccd9ce;padding:8px;text-align:left}th{background:#eaf4eb}@media print{button{display:none}}</style><h1>AreWarin Tutor OS — Attendance Report</h1><p>Generated ${esc(dateNow())} · ${sessions.length} sessions</p><table><tr><th>วันที่</th><th>เวลา</th><th>นักเรียน</th><th>ชั่วโมงที่ตัด</th><th>สถานะ</th></tr>${sessions.flatMap(s=>all('Attendance').filter(a=>a.session_id===s.id).map(a=>`<tr><td>${esc(s.date)}</td><td>${esc(s.start_time)}–${esc(s.end_time)}</td><td>${esc(studentName(a.student_id))}</td><td>${fmt(a.deduct_minutes)}</td><td>${esc(s.status)}</td></tr>`)).join('')}</table><p><button onclick="window.print()">Print / Save PDF</button></p></html>`;const win=window.open('','_blank');if(!win)throw Error('กรุณาอนุญาต Pop-up เพื่อพิมพ์รายงาน');win.document.write(html);win.document.close();}
async function onClick(e){const nav=e.target.closest('[data-view]');if(nav){go(nav.dataset.view);return;}const close=e.target.closest('[data-close]');if(close){closeModal();return;}if(e.target.id==='overlay'){closeModal();return;}const el=e.target.closest('[data-action]');if(!el)return;const act=el.dataset.action,id=el.dataset.id;try{switch(act){case 'add-student':openStudentForm();break;case 'edit-student':openStudentForm(byId('Students',id));break;case 'delete-student':await deleteStudent(id);break;case 'restore-student':await restoreStudent(id);break;case 'student-view-cards':state.studentLayout='cards';render();break;case 'student-view-table':state.studentLayout='table';render();break;case 'toggle-deleted':state.showDeleted=!state.showDeleted;state.studentId='';render();break;case 'add-course':openCourseForm();break;case 'new-course-for':openCourseForm(id);break;case 'student-detail':state.studentId=id;state.view='students';render();$('#profile')?.scrollIntoView({behavior:'smooth'});break;case 'hide-student':state.studentId='';render();break;case 'toggle-archive':state.showArchive=!state.showArchive;render();break;case 'renew-course':openRenew(byId('Courses',id));break;case 'renew-student':{const c=liveCourses(id)[0];if(!c)throw Error('ยังไม่มีคอร์สที่สามารถต่อได้');openRenew(c);break;}case 'topup-course':openTopup(byId('Courses',id));break;case 'adjust-course':openAdjustment(byId('Courses',id));break;case 'course-history':courseHistory(id);break;case 'add-group':openGroupForm();break;case 'group-members':groupMembershipHistory(id);break;case 'group-rule':openGroupRule(id);break;case 'add-meet-alias':openAliasForm(id);break;case 'remove-meet-alias':await removeAlias(id);break;case 'course-policy':openCoursePolicy(id);break;case 'integrity-check':openIntegrity();break;case 'suggest-import-group':{const d=state.importDraft;if(d){d.classType='group';d.groupId=id;d.basis=ruleFor('group',id)?.basis||'tutor';d.people.forEach(p=>{p.manualMinutes=null;p.classChoice=id;if(p.studentId)p.courseId=proposedCourse(p.studentId,'group',id)?.id||'';});render();}break;}case 'schedule-view-week':state.scheduleLayout='week';safeStorage('local','set','awtutor_schedule_layout_v1','week');render();break;case 'schedule-view-table':state.scheduleLayout='table';safeStorage('local','set','awtutor_schedule_layout_v1','table');render();break;case 'schedule-prev-week':state.scheduleWeek=addCalendarDays(state.scheduleWeek||calendarWeekStart(dateNow()),-7);render();break;case 'schedule-next-week':state.scheduleWeek=addCalendarDays(state.scheduleWeek||calendarWeekStart(dateNow()),7);render();break;case 'schedule-current-week':state.scheduleWeek=calendarWeekStart(dateNow());render();break;case 'add-schedule':openSchedule();break;case 'edit-schedule':openSchedule(byId('Schedules',id));break;case 'cancel-schedule':await cancelSchedule(id);break;case 'edit-group':openGroupForm(byId('Groups',id));break;case 'record-group':go('manual');setTimeout(()=>{const select=$('#group_id');if(select){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));}},0);break;case 'go-manual':go('manual');break;case 'go-import':go('import');break;case 'go-reviews':go('reviews');break;case 'go-history':go('history');break;case 'history-view-table':state.historyLayout='table';render();break;case 'history-view-day':state.historyLayout='day';render();break;case 'history-clear':Object.assign(state,{historyFrom:'',historyTo:'',historyStudent:'',historyGroup:'',historyCourse:'',historyTutor:'',historyStatus:'all'});render();break;case 'go-students':go('students');break;case 'connection':openConnection();break;case 'save-connection':saveConnection();break;case 'google-signin':googleLogin();break;case 'demo-mode':state.mode='demo';state.token='';clearGoogleSession();store=new DemoStore();closeModal();await reload();break;case 'disconnect':disconnect();break;case 'approve-session':previewApproval([id]);break;case 'review-select-all':state.reviewSelection=all('Sessions').filter(x=>x.status==='pending').map(x=>x.id);render();break;case 'review-select-none':state.reviewSelection=[];render();break;case 'review-approve-selected':previewApproval(state.reviewSelection);break;case 'summary-back':pendingSummaryAction=null;closeModal();break;case 'summary-confirm':await confirmSaveSummary();break;case 'cancel-session':await cancelSession(id);break;case 'edit-attendance':editAttendance(id);break;case 'session-detail':sessionDetail(id);break;case 'save-import':previewImportSave();break;case 'preview-import':previewImportSave();break;case 'bulk-select-all':selectImportBulk('all');break;case 'bulk-select-matched':selectImportBulk('matched');break;case 'bulk-select-none':selectImportBulk('none');break;case 'bulk-import-apply':applyImportBulk();break;case 'confirm-import-date':if(state.importDraft){if(!dateValid(state.importDraft.date))throw Error('วันที่ไม่ถูกต้อง');state.importDraft.dateConflict=false;state.importDraft.dateSource='manual';render();}break;case 'preview-batch-import':previewImportBatch();break;case 'batch-select-all':for(const [i,d] of state.importDrafts.entries())if(d&&!state.importDone[i])state.batchIncluded[i]=true;render();break;case 'batch-select-none':for(const [i,d] of state.importDrafts.entries())if(d&&!state.importDone[i])state.batchIncluded[i]=false;render();break;case 'skip-import':stepImport(1,true);break;case 'import-next':stepImport(1);break;case 'import-switch':state.importIndex=Number(id);loadCurrentImport();break;case 'reset-import':if(confirm('ล้างรายการไฟล์ที่กำลังตรวจสอบ? ข้อมูลที่บันทึกเป็น Pending ไปแล้วจะยังอยู่')){state.importQueue=[];state.importDrafts=[];state.importErrors=[];state.importDone=[];state.batchIncluded={};state.importDraft=null;render();}break;case 'close-modal':closeModal();break;case 'export-csv':downloadCSV();break;case 'print-report':printReport();break;}}catch(err){notice(err);}}
async function onChange(e){const t=e.target;try{if(t.id==='excel-file'){const files=[...t.files];if(!files.length)return;await prepareImportBatch(files);return;}if(t.id==='group_id'){const g=byId('Groups',t.value),ids=(g?.member_ids||'').split('|');document.querySelectorAll('.manual-check').forEach(check=>check.checked=ids.includes(check.value));const basis=$('#deduction_mode');if(basis&&ruleFor('group',t.value))basis.value=ruleFor('group',t.value).basis==='tutor'?'full':'full';return;}if(t.id==='summary-ack'){const button=$('#summary-confirm-btn');if(button)button.disabled=!t.checked;return;}if(t.hasAttribute('data-batch-select')){state.batchIncluded[Number(t.dataset.batchSelect)]=t.checked;return;}if(t.hasAttribute('data-review-check')){const sid=t.dataset.reviewCheck;state.reviewSelection=t.checked?[...new Set([...state.reviewSelection,sid])]:state.reviewSelection.filter(x=>x!==sid);const counter=$('#review-selected-count');if(counter)counter.textContent=state.reviewSelection.length;return;}if(t.id==='bulk-scope'){state.bulkScope=t.value;render();return;}if(t.id==='import-issue-only'){state.importIssueOnly=t.checked;render();return;}if(t.id==='bulk-class'){state.bulkClass=t.value;return;}if(t.id==='bulk-basis'){state.bulkBasis=t.value;render();return;}if(t.id==='bulk-minutes'){state.bulkMinutes=t.value;return;}if(t.id==='bulk-remember'){state.bulkRemember=t.checked;return;}if(t.id==='history-filter'){state.filter=t.value;render();return;}if(['history-from','history-to','history-student','history-group','history-course','history-tutor','history-status'].includes(t.id)){const key={'history-from':'historyFrom','history-to':'historyTo','history-student':'historyStudent','history-group':'historyGroup','history-course':'historyCourse','history-tutor':'historyTutor','history-status':'historyStatus'}[t.id];state[key]=t.value;render();return;}if(t.id==='student-grade-filter'){state.studentGradeFilter=t.value;render();return;}if(t.id==='student-status-filter'){state.studentStatusFilter=t.value;render();return;}const d=state.importDraft;if(!d)return;if(t.id==='import-date'){d.date=t.value;d.dateConflict=false;d.dateSource='manual';render();return;}if(t.id==='import-type'){d.classType=t.value;d.groupId=t.value==='group'?d.groupId:'';d.people.forEach(p=>{p.manualMinutes=null;});render();return;}if(t.id==='import-split'){d.split=t.checked;d.people.forEach(p=>{p.classChoice=p.classChoice||'private';p.manualMinutes=null;});render();return;}if(t.id==='import-group'){d.groupId=t.value;d.basis=ruleFor('group',t.value)?.basis||d.basis;d.people.forEach(p=>{p.manualMinutes=null;if(p.studentId)p.courseId=proposedCourse(p.studentId,'group',t.value)?.id||'';});render();return;}if(t.id==='import-tutor'){d.tutorIndex=Number(t.value);d.people[d.tutorIndex].include=false;d.people.forEach(p=>p.manualMinutes=null);render();return;}if(t.id==='import-basis'){d.basis=t.value;d.people.forEach(p=>p.manualMinutes=null);render();return;}if(t.id==='import-source'){d.sourceIndex=Number(t.value);d.people.forEach(p=>p.manualMinutes=null);render();return;}let i;if(t.hasAttribute('data-import-include')){i=Number(t.dataset.importInclude);d.people[i].include=t.checked;render();return;}if(t.hasAttribute('data-import-student')){i=Number(t.dataset.importStudent);const p=d.people[i];p.studentId=t.value;p.courseId=proposedCourse(p.studentId,d.classType,d.groupId)?.id||'';p.remember=!!p.studentId;p.matchLevel=p.studentId?'match':'unknown';p.matchReason=p.studentId?'เลือกนักเรียนด้วยตนเอง':'';const propagated=p.studentId?propagateMeetMapping(d,p):0;render();if(propagated)toast('จดจำและจับคู่ชื่อ Meet นี้เพิ่ม '+propagated+' รายการในชุดไฟล์');return;}if(t.hasAttribute('data-import-remember')){i=Number(t.dataset.importRemember);d.people[i].remember=t.checked;return;}if(t.hasAttribute('data-import-class')){i=Number(t.dataset.importClass);const p=d.people[i];p.classChoice=t.value;p.courseId=proposedCourse(p.studentId,t.value==='private'?'private':'group',t.value)?.id||'';p.manualMinutes=null;render();return;}if(t.hasAttribute('data-import-course')){i=Number(t.dataset.importCourse);d.people[i].courseId=t.value;return;}if(t.hasAttribute('data-import-minutes')){i=Number(t.dataset.importMinutes);d.people[i].manualMinutes=t.value===''?NaN:Number(t.value);return;}}catch(err){notice(err);}}
function onInput(e){if(e.target.id==='student-search'){state.search=e.target.value;const pos=e.target.selectionStart;render();const next=$('#student-search');next?.focus();try{next.setSelectionRange(pos,pos);}catch{}}if(e.target.id==='bulk-minutes'){state.bulkMinutes=e.target.value;}if(e.target.hasAttribute('data-import-minutes')){const d=state.importDraft;if(d)d.people[Number(e.target.dataset.importMinutes)].manualMinutes=e.target.value===''?NaN:Number(e.target.value);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
function integrityIssues(){const issues=[];for(const c of all('Courses')){if(balance(c.id)<0)issues.push({kind:'balance',text:'ยอดติดลบ: '+studentName(c.student_id)+' / '+c.title});}
  const fingerprints=new Set();for(const x of all('Imports')){if(fingerprints.has(x.fingerprint))issues.push({kind:'duplicate',text:'พบไฟล์ Import ซ้ำ: '+x.filename});fingerprints.add(x.fingerprint);}
  for(const s of all('Sessions').filter(x=>x.status==='approved'))for(const a of all('Attendance').filter(x=>x.session_id===s.id)){const recorded=all('Ledger').filter(l=>l.session_id===s.id&&l.course_id===a.course_id&&l.type==='deduct').reduce((n,l)=>n+num(l.minutes),0);if(recorded===0&&num(a.deduct_minutes)>0)issues.push({kind:'ledger',text:'Approved โดยไม่พบ Ledger หักชั่วโมง: '+studentName(a.student_id)+' '+s.date});}
  for(const a of activeAliasRows()){const conflicts=activeAliasRows().filter(x=>x.id!==a.id&&x.student_id!==a.student_id&&((a.normalized_name&&a.normalized_name===x.normalized_name)||(a.normalized_email&&a.normalized_email===x.normalized_email)));if(conflicts.length)issues.push({kind:'identity',text:'ชื่อ Meet ขัดแย้ง: '+a.meet_name+' → '+studentName(a.student_id)});}
  return issues;}
function openIntegrity(){const issues=integrityIssues();modal('Data Integrity · ตรวจสอบฐานข้อมูล',`<div class="note">ตรวจสอบยอดติดลบ รายงานนำเข้าซ้ำ การขาด Ledger และชื่อ Meet ขัดแย้ง · ผลนี้เป็นการตรวจในฝั่งเบราว์เซอร์ ไม่ใช่การรับรองธุรกรรมจากเซิร์ฟเวอร์</div><div class="metric-strip mt20"><div><small>รายการที่พบ</small><b>${issues.length}</b></div><div><small>สถานะ</small><b>${issues.length?'Needs Review':'No issues detected'}</b></div></div><div class="mt20">${issues.map(x=>`<div class="note warn mt12"><strong>${esc(x.kind)}</strong> · ${esc(x.text)}</div>`).join('')||'<div class="note">ไม่พบความผิดปกติตามกฎที่ตรวจสอบในเวอร์ชันนี้</div>'}</div>`, '',true);}
// Class Schedule v1.5: same occurrences feed the weekly calendar and the table.
// Work only with UTC date math on yyyy-mm-dd strings, so the user's local DST/timezone cannot shift weekdays.
function addCalendarDays(date,delta){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
function calendarWeekStart(date){const day=new Date(date+'T12:00:00Z').getUTCDay();return addCalendarDays(date,-((day+6)%7));}
function thaiScheduleDate(date,options={day:'numeric',month:'short'}){return new Date(date+'T12:00:00Z').toLocaleDateString('th-TH',{timeZone:'UTC',...options});}
function scheduleOccurrences(from,to){
 const result=[];
 for(const entry of all('Schedules').filter(e=>e.status==='active'&&e.date&&e.date<=to)){
  if(entry.repeat_rule==='weekly'){
   const weekday=new Date(entry.date+'T12:00:00Z').getUTCDay();
   for(let ds=from;ds<=to;ds=addCalendarDays(ds,1)){
    if(ds>=entry.date&&new Date(ds+'T12:00:00Z').getUTCDay()===weekday)result.push({...entry,on_date:ds});
   }
  }else if(entry.date>=from&&entry.date<=to)result.push({...entry,on_date:entry.date});
 }
 return result.sort((a,b)=>(a.on_date+a.start_time+a.id).localeCompare(b.on_date+b.start_time+b.id));
}
function scheduledDates(){const today=dateNow();return scheduleOccurrences(today,addCalendarDays(today,20));}
function schedule(){
 const weekStart=state.scheduleWeek||calendarWeekStart(dateNow());
 const weekEnd=addCalendarDays(weekStart,6);
 const items=scheduleOccurrences(weekStart,weekEnd);
 const isTable=state.scheduleLayout==='table';
 const countPrivate=items.filter(x=>!x.group_id).length;
 const countGroup=items.length-countPrivate;
 const days=['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];
 const label=x=>x.group_id?byId('Groups',x.group_id)?.name||'ไม่พบกลุ่ม':studentName(x.student_id);
 const controls=`<div class="schedule-controls" role="toolbar" aria-label="มุมมองตารางเรียน"><div class="schedule-view-switch" role="group" aria-label="เลือกมุมมอง"><button type="button" data-action="schedule-view-week" class="${!isTable?'selected':''}" aria-pressed="${!isTable}">▦ รายสัปดาห์</button><button type="button" data-action="schedule-view-table" class="${isTable?'selected':''}" aria-pressed="${isTable}">☷ ตารางรายการ</button></div><div class="schedule-navigation"><button type="button" class="schedule-nav" data-action="schedule-prev-week" aria-label="สัปดาห์ก่อนหน้า">‹</button><strong>${esc(thaiScheduleDate(weekStart))} – ${esc(thaiScheduleDate(weekEnd,{day:'numeric',month:'short',year:'numeric'}))}</strong><button type="button" class="schedule-nav" data-action="schedule-next-week" aria-label="สัปดาห์ถัดไป">›</button><button type="button" class="btn small soft" data-action="schedule-current-week">สัปดาห์นี้</button></div></div>`;
 const stats=`<div class="schedule-stats"><span>${pill(items.length+' คาบ','green')}</span><span class="schedule-key"><i class="schedule-dot private"></i> เรียนเดี่ยว ${countPrivate}</span><span class="schedule-key"><i class="schedule-dot group"></i> เรียนกลุ่ม ${countGroup}</span></div>`;
 const week=`<div class="schedule-week-scroll" tabindex="0" aria-label="ตารางเรียน 7 วัน เลื่อนซ้ายขวาได้"><div class="schedule-week-grid">${days.map((day,i)=>{
  const date=addCalendarDays(weekStart,i),daily=items.filter(x=>x.on_date===date),today=date===dateNow();
  return `<section class="schedule-day ${today?'is-today':''}" aria-label="วัน${day} ${esc(thaiScheduleDate(date))}"><div class="schedule-day-head"><span>${day}</span><strong>${esc(thaiScheduleDate(date,{day:'numeric'}))}</strong></div><div class="schedule-day-body">${daily.map(x=>`<article class="schedule-event ${x.group_id?'group':'private'}"><div class="schedule-event-time">${esc(x.start_time)}–${esc(x.end_time)}</div><div class="schedule-event-title">${esc(label(x))}</div><div class="schedule-event-desc">${x.group_id?'กลุ่ม':'เดี่ยว'} · ${esc(nice(duration(x.start_time,x.end_time)))}</div><div class="schedule-event-desc">${esc(x.tutor||'—')}</div>${x.notes?`<div class="schedule-event-note">${esc(x.notes)}</div>`:''}<div class="schedule-event-actions">${btnInline('แก้ไข','edit-schedule',x.id)}</div></article>`).join('')||'<div class="schedule-day-empty">— ไม่มีคาบ —</div>'}</div></section>`;
 }).join('')}</div></div><div class="schedule-mobile-hint">บนมือถือ เลื่อนตารางไปทางซ้าย–ขวาเพื่อดูครบทั้ง 7 วัน</div>`;
 const table=`<div class="table-wrap schedule-table-wrap"><table><thead><tr><th>วันที่</th><th>เวลา</th><th>ประเภท</th><th>นักเรียน / กลุ่ม</th><th>ระยะเวลา</th><th>ติวเตอร์</th><th>ทำซ้ำ</th><th>จัดการ</th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(thaiScheduleDate(x.on_date,{weekday:'short',day:'numeric',month:'short'}))}</td><td class="schedule-time-cell">${esc(x.start_time)}–${esc(x.end_time)}</td><td>${pill(x.group_id?'กลุ่ม':'เดี่ยว',x.group_id?'blue':'green')}</td><td><strong>${esc(label(x))}</strong>${x.notes?`<div class="td-secondary">${esc(x.notes)}</div>`:''}</td><td>${esc(nice(duration(x.start_time,x.end_time)))}</td><td>${esc(x.tutor||'—')}</td><td>${pill(x.repeat_rule==='weekly'?'ทุกสัปดาห์':'ครั้งเดียว')}</td><td>${btnInline('แก้ไข','edit-schedule',x.id)} ${btnInline('ยกเลิก','cancel-schedule',x.id)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">ยังไม่มีคาบเรียนในสัปดาห์นี้ ลองเปลี่ยนสัปดาห์หรือกดเพิ่มตารางเรียน</td></tr>'}</tbody></table></div>`;
 return `${head('CALENDAR / PLANNING','Class Schedule','ดูตารางเรียนแบบรายสัปดาห์หรือแบบตารางรายการได้ และสลับมุมมองได้ทุกเวลา',btn('＋ เพิ่มตารางเรียน','add-schedule','primary'))}<div class="panel"><div class="note">ตารางเรียนเป็นรายการวางแผน ยังไม่ตัดชั่วโมงโดยอัตโนมัติ เมื่อต้องการตัดชั่วโมงให้ไปที่ Record Hours หรือ Import Excel แล้วอนุมัติ</div>${controls}${stats}${isTable?table:week}</div>`;
}
function openSchedule(s){modal(s?'แก้ไขตารางเรียน':'เพิ่มตารางเรียน',`<form class="form" id="schedule-form"><input type="hidden" name="id" value="${esc(s?.id||'')}">${field('sched-date','วันที่เริ่ม','date',s?.date||dateNow(),'required')}<div class="grid-2">${field('sched-start','เวลาเริ่ม','time',s?.start_time||'18:00','required')}${field('sched-end','เวลาสิ้นสุด','time',s?.end_time||'20:00','required')}</div>${selectField('sched-student','นักเรียนรายบุคคล',studentOptions(s?.student_id||''))}${selectField('sched-group','หรือเลือกกลุ่มเรียน',`<option value="">— ไม่ใช่กลุ่ม —</option>${all('Groups').map(g=>`<option value="${esc(g.id)}" ${s?.group_id===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}`)}<div class="grid-2">${field('sched-tutor','ติวเตอร์','text',s?.tutor||'Suthawarin','required')}${selectField('sched-repeat','ทำซ้ำ',`<option value="once" ${s?.repeat_rule!=='weekly'?'selected':''}>เฉพาะครั้งนี้</option><option value="weekly" ${s?.repeat_rule==='weekly'?'selected':''}>ทุกสัปดาห์</option>`)}</div>${field('sched-note','หมายเหตุ','text',s?.notes||'')}<button class="btn primary" type="submit">บันทึกตารางเรียน</button></form>`);}
async function saveSchedule(f){const id=inputVal(f,'id'),date=inputVal(f,'sched-date'),start=inputVal(f,'sched-start'),end=inputVal(f,'sched-end'),studentId=inputVal(f,'sched-student'),groupId=inputVal(f,'sched-group');if(!dateValid(date)||!Number.isFinite(duration(start,end))||duration(start,end)<=0||duration(start,end)>720||(!studentId&&!groupId))throw Error('กรุณาระบุวันที่ เวลา และนักเรียนหรือกลุ่มที่ต้องการสอน');const item={id:id||uuid(),date,student_id:groupId?'':studentId,group_id:groupId,start_time:start,end_time:end,tutor:inputVal(f,'sched-tutor'),repeat_rule:inputVal(f,'sched-repeat'),status:'active',notes:inputVal(f,'sched-note'),created_at:byId('Schedules',id)?.created_at||now()};const change=id?{update:{Schedules:[item]},add:{Audit:[saveAudit('schedule_updated',item.id,{date})]}}:{add:{Schedules:[item],Audit:[saveAudit('schedule_created',item.id,{date})]}};await commit(change);closeModal();toast('บันทึกตารางเรียนแล้ว');}
async function cancelSchedule(id){const s=byId('Schedules',id);if(!s)return;if(!confirm('ยกเลิกตารางเรียนนี้ (รวมรายการทำซ้ำถ้ามี) ใช่หรือไม่?'))return;await commit({update:{Schedules:[{...s,status:'cancelled'}]},add:{Audit:[saveAudit('schedule_cancelled',id,{date:s.date})]}});toast('ยกเลิกตารางเรียนแล้ว');}
function openAdjustment(c){if(!c||!['active','held'].includes(c.status))return;modal('ปรับยอดชั่วโมงคอร์ส',`<form class="form" id="adjust-form"><input type="hidden" name="course_id" value="${esc(c.id)}"><div class="note">${esc(studentName(c.student_id))} · ${esc(c.title)} · คงเหลือ ${fmt(balance(c.id))} ชั่วโมง<br>ใช้ตัวเลขบวกเพื่อเพิ่มชั่วโมง หรือใส่ค่าติดลบเพื่อลดชั่วโมง โดยต้องระบุเหตุผลเพื่อเก็บประวัติ</div>${field('adjust-minutes','นาทีที่ต้องการปรับ (เช่น +30 หรือ -15)','number','30','step="1" min="-10000" max="10000" required')}${field('adjust-reason','เหตุผลในการปรับยอด','text','','required')}<button class="btn primary" type="submit">บันทึกรายการปรับยอด</button></form>`);}
async function saveAdjustment(f){const c=byId('Courses',inputVal(f,'course_id')),minutes=Number(inputVal(f,'adjust-minutes')),reason=inputVal(f,'adjust-reason');if(!c||!['active','held'].includes(c.status)||!Number.isInteger(minutes)||minutes===0||Math.abs(minutes)>10000||!reason)throw Error('รายการปรับยอดไม่ถูกต้อง');if(balance(c.id)+minutes<0)throw Error('ไม่สามารถปรับยอดให้ติดลบ');await commit({add:{Ledger:[{id:uuid(),student_id:c.student_id,course_id:c.id,session_id:'',type:'adjustment',minutes,note:reason,created_at:now()}],Audit:[saveAudit('manual_adjustment',c.id,{minutes,reason})]}});closeModal();toast('ปรับยอดเรียบร้อยพร้อมบันทึกประวัติ');}
