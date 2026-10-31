const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');const mem=new Map();
class FakeFormData{constructor(form){this.values=form.values||{};}get(k){return this.values[k]??'';}}
const context=vm.createContext({window:{TUTOR_CONFIG:{}},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},FormData:FakeFormData,CSS:{escape:s=>s},crypto:globalThis.crypto,console,Date,Math,Map,Set,Number,String,JSON,Promise,confirm:()=>true});
vm.runInContext(source,context);
const run=x=>vm.runInContext(x,context),fake=values=>({values,querySelector(){return null;}});
run('render=()=>{};closeModal=()=>{};toast=()=>{};showBusy=()=>{};hideBusy=()=>{};store=new DemoStore();state.data=makeDemo();state.mode="demo"');mem.set('awtutor_v1_demo',JSON.stringify(run('state.data')));
(async()=>{
  // Distinct group members: single-person change must not cancel the entire class.
  run(`state.data.Schedules=[{id:'weekly-G',date:'2026-10-01',student_id:'',group_id:'demo-group-1',start_time:'18:00',end_time:'19:00',tutor:'Tutor',repeat_rule:'weekly',status:'active',notes:'',created_at:now()}];`);
  mem.set('awtutor_v1_demo',JSON.stringify(run('state.data')));
  context.exForm=fake({'ex-schedule':'weekly-G','ex-date':'2026-11-05','ex-student':'demo-student-a','ex-kind':'cancelled','ex-new-date':'','ex-new-start':'18:00','ex-new-end':'19:00','ex-reason':'ลาหยุดเฉพาะน้อง A'});
  await run('saveException(exForm)');
  assert.equal(run(`personalCalendarItems('demo-student-a','2026-11-05','2026-11-05').filter(x=>x.source==='planned').length`),0);
  assert.equal(run(`personalCalendarItems('demo-student-b','2026-11-05','2026-11-05').filter(x=>x.source==='planned').length`),1);
  // Global exception should appear at moved date even outside original week range.
  context.exForm=fake({'ex-schedule':'weekly-G','ex-date':'2026-11-12','ex-student':'','ex-kind':'rescheduled','ex-new-date':'2026-11-20','ex-new-start':'18:30','ex-new-end':'19:30','ex-reason':'เปลี่ยนวันเฉพาะสัปดาห์'});
  await run('saveException(exForm)');
  assert.equal(run(`scheduleOccurrences('2026-11-12','2026-11-12').length`),0);
  assert.equal(run(`scheduleOccurrences('2026-11-20','2026-11-20').filter(x=>x.id==='weekly-G').length`),1);
  // Course-specific leave must not accidentally hide unrelated scheduled classes
  context.leaveForm=fake({'leave-student':'demo-student-b','leave-course':'demo-course-b','leave-kind':'pause','leave-start':'2026-11-01','leave-end':'2026-11-07','leave-return':'2026-11-10','leave-reason':'พักเฉพาะวิชา'});
  await run('saveLeave(leaveForm)');
  assert.equal(run(`!!activeLeave('demo-student-b','2026-11-05','demo-course-b')`),true);
  assert.equal(run(`!!activeLeave('demo-student-b','2026-11-05')`),false);
  // Partial payment cancellation must request refund and remember actual received amount.
  run(`state.data.Courses.push({id:'hourly-T',student_id:'demo-student-b',title:'รายชั่วโมง',cycle_no:1,status:'active',billing_mode:'hourly',hourly_rate_baht:400});state.data.Sessions.push({id:'bill-session',date:'2026-11-09',start_time:'13:00',end_time:'14:00',status:'approved',created_at:now()});state.data.Attendance.push({id:'bill-att',session_id:'bill-session',student_id:'demo-student-b',course_id:'hourly-T',actual_minutes:60,deduct_minutes:60,status:'approved',created_at:now()});state.data.Billing.push(hourlyInvoice(byId('Attendance','bill-att'),byId('Courses','hourly-T')));`);
  mem.set('awtutor_v1_demo',JSON.stringify(run('state.data')));
  const bid=run(`all('Billing').find(b=>b.attendance_id==='bill-att').id`);
  context.payForm=fake({'bill-ids':bid,'pay-amount':'150','pay-method':'transfer','pay-date':'2026-11-10','pay-note':'งวดแรก'});context.payForm.querySelector=sel=>sel==='[name="confirm-paid"]'?{checked:true}:null;
  await run('savePartialPayment(payForm)');
  assert.equal(run(`byId('Billing','${bid}').status`),'partial');
  assert.equal(run(`billDueSatang(byId('Billing','${bid}'))`),25000);
  await run(`cancelAttendance('bill-att')`);
  assert.equal(run(`byId('Billing','${bid}').status`),'refund_due');
  assert.equal(run(`billPaidSatang(byId('Billing','${bid}'))`),15000);
  await run(`markRefunded('${bid}')`);
  assert.equal(run(`byId('Billing','${bid}').status`),'refunded');
  console.log('PASS v2.3 group exception, cross-week reschedule, course-specific leave, partial refund');
})().catch(e=>{console.error(e);process.exit(1)});
