const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const memory=new Map();
const context=vm.createContext({
  window:{TUTOR_CONFIG:{}},
  document:{readyState:'loading',addEventListener(){}},
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
  crypto:globalThis.crypto,
  console,Date,Math,Map,Set,Number,String,JSON,Promise,
  FormData:class {constructor(f){this.data=f.vals||{}}get(key){return this.data[key]||'';}},
  confirm:()=>true,
});
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context);
run('render=()=>{};closeModal=()=>{};toast=()=>{};store=new DemoStore();');
(async()=>{
  run('state.data=makeDemo()');
  assert.equal(run("resolveMeetIdentity('A Biology','').studentId"),'demo-student-a');
  assert.equal(run('membersOf("demo-group-1").length'),2);
  assert.equal(run('overlapMinutes([[0,70],[30,90]],[[20,60]])'),40);
  assert.equal(run('adjustedByRule(61,{rounding_minutes:15,minimum_minutes:0})'),75);
  // Must not silently match a duplicated display name.
  run("state.data.Students.push({id:'second-a',name:'A Biology',status:'active',email:'',aliases:''})");
  assert.equal(run("resolveMeetIdentity('A Biology','').level"),'conflict');
  run('state.data.Students.pop()');
  // Persist a manually confirmed alias during import.
  run(`state.importDraft={filename:'test-a.xlsx',fingerprint:'unique-a',date:'2026-11-02',classType:'private',groupId:'',split:false,basis:'tutor',tutorIndex:0,sourceIndex:0,people:[
  {name:'Tutor',email:'',actual:120,join:'18:00',leave:'20:00',segments:[[1080,1200]],studentId:'',include:false},
  {name:'Tablet A',email:'',actual:105,join:'18:15',leave:'20:00',segments:[[1095,1200]],studentId:'demo-student-a',courseId:'demo-course-a',include:true,remember:true,variants:[{name:'Tablet A',email:''}],manualMinutes:null,classChoice:'private'}]};state.importDrafts=[state.importDraft];state.importQueue=[{name:'test-a.xlsx'}];state.importIndex=0;state.importDone=[''];`);
  await run('saveImport()');
  assert.equal(run("all('MeetAliases').filter(a=>a.meet_name==='Tablet A').length"),1);
  assert.equal(run("resolveMeetIdentity('Tablet A','').studentId"),'demo-student-a');
  assert.equal(run("all('Sessions').filter(s=>s.date==='2026-11-02').length"),1);
  assert.equal(run("all('Sessions').filter(s=>s.date==='2026-11-02')[0].status"),'pending');
  // Approval should deduct from ledger only once.
  const id=run("all('Sessions').filter(s=>s.date==='2026-11-02')[0].id");
  context.sid=id;
  await run('approveSession(sid)');
  assert.equal(run('balance("demo-course-a")'),360);
  await assert.rejects(()=>run('approveSession(sid)'),/รออนุมัติ/);
  // Reimport same source must be rejected.
  run('state.importDraft=state.importDrafts[0]');await assert.rejects(()=>run('saveImport()'),/เคยนำเข้า/);
  // One Excel may be split into an individual lesson and group lesson.
  run(`state.importDraft={filename:'test-b.xlsx',fingerprint:'unique-b',date:'2026-11-03',classType:'group',groupId:'demo-group-1',split:true,basis:'tutor',tutorIndex:0,sourceIndex:0,people:[
   {name:'Tutor',email:'',actual:60,join:'21:00',leave:'22:00',segments:[[1260,1320]],studentId:'',include:false},
   {name:'Tablet A',email:'',actual:60,join:'21:00',leave:'22:00',segments:[[1260,1320]],studentId:'demo-student-a',courseId:'demo-course-a',include:true,remember:false,manualMinutes:null,classChoice:'private'},
   {name:'B',email:'',actual:60,join:'21:00',leave:'22:00',segments:[[1260,1320]],studentId:'demo-student-b',courseId:'demo-course-b',include:true,remember:false,manualMinutes:null,classChoice:'demo-group-1'}]};state.importDrafts=[state.importDraft];state.importQueue=[{name:'test-b.xlsx'}];state.importIndex=0;state.importDone=[''];`);
  await run('saveImport()');
  assert.equal(run("all('Sessions').filter(s=>s.date==='2026-11-03').length"),2);
  assert.equal(run("all('Imports').filter(i=>i.fingerprint==='unique-b').length"),1);
  // Member removals must keep historical rows.
  context.groupForm={vals:{id:'demo-group-1','group-name':'Biology Olympiad 01'},querySelectorAll(){return [{value:'demo-student-a'}]}};
  await run('saveGroup(groupForm)');
  assert.equal(run('membersOf("demo-group-1").length'),1);
  assert.equal(run("all('GroupMemberships').some(m=>m.student_id==='demo-student-b'&&m.status==='left')"),true);
  // Check negative balance is surfaced.
  run("state.data.Ledger.push({id:'negative',course_id:'demo-course-b',type:'adjustment',minutes:-9999})");
  assert.equal(run('integrityIssues().some(i=>i.kind===\'balance\')'),true);
  console.log('PASS 13 checks: alias identity / conflict / grouping / overlap / rounding / import / approval / duplicate / split / membership / integrity');
})().catch(err=>{console.error(err);process.exit(1)});
