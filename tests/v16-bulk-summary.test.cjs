const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const mem=new Map();let renderedModal='';
const context=vm.createContext({window:{TUTOR_CONFIG:{}},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},crypto:globalThis.crypto,console,Date,Math,Map,Set,Number,String,JSON,Promise,confirm:()=>true});
vm.runInContext(code,context);
const run=expr=>vm.runInContext(expr,context);
run('render=()=>{};closeModal=()=>{};toast=()=>{};store=new DemoStore();state.data=makeDemo()');
function fixture(file,date,name='A Biology'){
 return {filename:file,fingerprint:file,date,classType:'private',groupId:'',split:false,basis:'tutor',tutorIndex:0,sourceIndex:0,people:[
  {name:'Tutor',email:'',actual:90,join:'18:00',leave:'19:30',segments:[[1080,1170]],studentId:'',include:false},
  {name,email:'',actual:75,join:'18:15',leave:'19:30',segments:[[1095,1170]],studentId:'demo-student-a',courseId:'demo-course-a',include:true,remember:true,variants:[{name,email:''}],manualMinutes:75,classChoice:'private'}]};
}
context.d0=fixture('report-1.xlsx','2026-12-07');context.d1=fixture('report-2.xlsx','2026-12-07');
run("state.importDrafts=[d0,d1];state.importQueue=[{name:d0.filename},{name:d1.filename}];state.importDone=['',''];state.importIndex=0;state.importDraft=d0");
assert.throws(()=>run('constructImportBatch([0,1])'),/เวลาซ้อน/);
context.d1.date='2026-12-08';
const plan=run('constructImportBatch([0,1])');
assert.equal(plan.sessions.length,2);
assert.equal(plan.attendance.length,2);
assert.equal(plan.aliases.length,0); // identity was already memorized on student from demo
(async()=>{
 await run('saveImports([0,1])');
 assert.equal(run('all("Imports").length'),2);
 assert.equal(run('all("Sessions").filter(s=>s.status==="approved"&&s.mode==="excel").length'),2);
 assert.equal(run('all("Ledger").filter(l=>l.type==="deduct").length'),4); // original 2 + 2 new deductions
 assert.equal(run('state.importQueue.length'),0); // clear upload workspace after save
 const ids=run('all("Sessions").filter(s=>s.status==="approved"&&s.mode==="excel").map(s=>s.id)');context.ids=ids;
 assert.equal(run('balance("demo-course-a")'),330);
 assert.throws(()=>run('buildApproval(ids)'),/รออนุมัติ/);
 context.replay=context.d0;run('state.importDrafts=[replay];state.importDone=[""]');assert.throws(()=>run('constructImportBatch([0])'),/เคยนำเข้า/);
 console.log('PASS v1.8 bulk import overlap rejection, immediate deduction, no double-deduction');
})().catch(e=>{console.error(e);process.exit(1)});
