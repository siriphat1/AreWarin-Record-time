const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const mem=new Map();
class FakeFormData {constructor(form){this.values=form.values||{};} get(k){return this.values[k]??'';}}
const context=vm.createContext({window:{TUTOR_CONFIG:{}},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},FormData:FakeFormData,CSS:{escape:s=>s},crypto:globalThis.crypto,console,Date,Math,Map,Set,Number,String,JSON,Promise,confirm:()=>true});
vm.runInContext(source,context);const run=expr=>vm.runInContext(expr,context);
run('render=()=>{};closeModal=()=>{};toast=()=>{};showBusy=()=>{};hideBusy=()=>{};store=new DemoStore();state.mode="demo";state.data=makeDemo();');
mem.set('awtutor_v1_demo',JSON.stringify(run('state.data')));
const fake=values=>({values,querySelectorAll(sel){if(sel==='input[name=participant]:checked')return [{value:'demo-student-a'}];return [];},querySelector(sel){if(sel.startsWith('select.manual-course'))return {value:run('liveCourses("demo-student-a").find(c=>isHourly(c)).id')};if(sel==='[name="confirm-paid"]')return {checked:true};return null;}});
(async()=>{
 context.f=fake({'student-name':'น้อง H','student-hourly-rate':'450','student-school':'โรงเรียนตัวอย่าง','student-status':'active'});
 await run('saveStudent(f)');
 const learner=run('all("Students").find(x=>x.name==="น้อง H")');assert.ok(learner);
 const first=run(`all("Courses").find(c=>c.student_id==="${learner.id}"&&isHourly(c))`);
 assert.ok(first);assert.equal(Number(first.hourly_rate_baht),450);assert.equal(run(`all("Ledger").filter(l=>l.course_id==="${first.id}").length`),0);
 context.courseId=first.id;
 context.manualForm=fake({'class_date':'2026-11-02','class_start':'18:00','class_end':'19:30','group_id':'','tutor':'Tutor','class_notes':'ชำระเงินหลังเรียน'});
 context.manualForm.querySelectorAll=()=>[{value:learner.id}];context.manualForm.querySelector=()=>({value:first.id});
 await run('saveManual(manualForm)');
 const bill=run(`all("Billing").find(b=>b.student_id==="${learner.id}")`);
 assert.ok(bill);assert.equal(bill.minutes,90);assert.equal(Number(bill.amount_satang),67500);assert.equal(bill.status,'unpaid');
 assert.equal(run(`balance("${first.id}")`),0);
 assert.equal(run(`all("Ledger").filter(l=>l.course_id==="${first.id}"&&l.type==="deduct").length`),0);
 context.billId=bill.id;context.payForm=fake({'bill-id':bill.id,'pay-method':'transfer','pay-note':'ตรวจสอบยอดโอนแล้ว'});
 await run('markPaid(payForm)');
 assert.equal(run(`byId("Billing","${bill.id}").status`),'paid');
 context.renewForm=fake({'old_id':first.id,'renew-date':'2026-11-10','renew-title':'เรียนรายชั่วโมง','renew-rate':'500'});
 await run('renewCourse(renewForm)');
 const later=run(`all("Courses").find(c=>c.previous_course_id==="${first.id}")`);
 assert.ok(later);assert.equal(later.cycle_no,2);assert.equal(Number(later.hourly_rate_baht),500);
 assert.equal(run(`byId("Courses","${first.id}").status`),'archived');
 assert.equal(run(`byId("Billing","${bill.id}").status`),'paid');
 context.newForm=fake({'class_date':'2026-11-12','class_start':'18:00','class_end':'19:30','group_id':'','tutor':'Tutor','class_notes':''});
 context.newForm.querySelectorAll=()=>[{value:learner.id}];context.newForm.querySelector=()=>({value:later.id});
 await run('saveManual(newForm)');
 const next=run(`all("Billing").find(b=>b.course_id==="${later.id}")`);assert.equal(Number(next.amount_satang),75000);
 // Cancel an unpaid attendance: invoice is void, no payment is recorded.
 await run(`cancelAttendance("${next.attendance_id}")`);
 assert.equal(run(`byId("Billing","${next.id}").status`),'void');
 // Cancel the previously paid attendance: mark refund due, do not claim refund completed.
 await run(`cancelAttendance("${bill.attendance_id}")`);
 assert.equal(run(`byId("Billing","${bill.id}").status`),'refund_due');
 await run(`markRefunded("${bill.id}")`);
 assert.equal(run(`byId("Billing","${bill.id}").status`),'refunded');
 console.log('PASS hourly student creation, 90min billing, payment close, renewal preserves history, repricing, cancellation and refund acknowledgement');
})().catch(e=>{console.error(e);process.exit(1)});
