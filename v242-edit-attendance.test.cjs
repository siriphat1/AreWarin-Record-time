const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const memory=new Map();
const ctx=vm.createContext({window:{TUTOR_CONFIG:{}},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},FormData:class{constructor(f){this.f=f;}get(k){return this.f[k]??'';}},crypto:globalThis.crypto,console,Date,Math,Number,Map,Set,String,JSON,Promise,confirm:()=>true});
vm.runInContext(source,ctx);
const run=x=>vm.runInContext(x,ctx);
run(`render=()=>{};closeModal=()=>{};toast=()=>{};showBusy=()=>{};hideBusy=()=>{};
store={commit:async(changes)=>{globalThis.lastChanges=changes;for(const [key,rows] of Object.entries(changes.update||{})){for(const row of rows){const idx=state.data[key].findIndex(x=>x.id===row.id);if(idx<0)throw Error('row missing');state.data[key][idx]=row;}}for(const [key,rows] of Object.entries(changes.add||{}))state.data[key].push(...rows);return state.data;}};`);
function reset(){run(`state.data=makeDemo();state.busy=false;state.data.Attendance[0].join_time='16:33';state.data.Attendance[0].leave_time='17:09';state.data.Attendance[0].actual_minutes=36;state.data.Attendance[0].deduct_minutes=36;state.data.Ledger.find(x=>x.session_id==='demo-session').minutes=-36;`);}
function form(start,end,reason='แก้ไขตามเวลาเรียนจริง'){return JSON.stringify({id:run('state.data.Attendance[0].id'),'edit-join':start,'edit-leave':end,'edit-reason':reason,'edit-minutes':'720','edit-actual':'720'});}
(async()=>{
 assert.equal(run("editedAttendanceDuration('16:33','17:08')"),35);
 assert.equal(run("editedAttendanceDuration('18:00','19:30')"),90);
 assert.equal(run("editedAttendanceDuration('23:45','00:15')"),30);
 assert(Number.isNaN(run("editedAttendanceDuration('17:00','17:00')")));
 assert(Number.isNaN(run("editedAttendanceDuration('17:00','16:50')")));
 assert(Number.isNaN(run("editedAttendanceDuration('x','20:00')")));
 reset();
 const before=run("balance('demo-course-a')");
 await run('saveEditAttendance('+form('16:33','17:08')+')');
 assert.equal(run('state.data.Attendance[0].actual_minutes'),35);
 assert.equal(run('state.data.Attendance[0].deduct_minutes'),35);
 assert.equal(run('state.data.Ledger.at(-1).minutes'),1);
 assert.equal(run("balance('demo-course-a')"),before+1);
 assert.equal(run("all('Audit').at(-1).action"),'attendance_edited');
 // Re-edit an approved attendance: apply only the NEW difference, never re-deduct the full duration.
 await run('saveEditAttendance('+form('16:33','17:33')+')');
 assert.equal(run('state.data.Attendance[0].deduct_minutes'),60);
 assert.equal(run('state.data.Ledger.at(-1).minutes'),-25);
 assert.equal(run("balance('demo-course-a')"),before-24);
 // No adjustment should be added when the clock inputs produce the existing duration.
 const ledgers=run("all('Ledger').length");
 await run('saveEditAttendance('+form('16:33','17:33')+')');
 assert.equal(run("all('Ledger').length"),ledgers);
 // Throw on incorrect clock time, ignore injected minute form values.
 await assert.rejects(()=>run('saveEditAttendance('+form('18:00','18:00')+')'),/เวลาเข้า–ออก/);
 assert.equal(run('state.data.Attendance[0].deduct_minutes'),60);
 await assert.rejects(()=>run('saveEditAttendance('+form('16:33','17:33','')+')'),/เหตุผล/); // Empty reason is rejected even with valid times
 reset();
 await assert.rejects(()=>run('saveEditAttendance('+form('16:33','04:34')+')'),/เวลาเข้า–ออก/); // >12h
 // No overdraw if edited duration increases beyond remaining package balance.
 reset();run("state.data.Ledger.push({id:'use-up',course_id:'demo-course-a',minutes:-530,session_id:'other'})");
 await assert.rejects(()=>run('saveEditAttendance('+form('16:33','18:33')+')'),/คงเหลือไม่พอ/);
 reset();
 run(`state.data.Courses.push({id:'hourly-course',student_id:'demo-student-a',title:'Hourly',cycle_no:1,billing_mode:'hourly',hourly_rate_baht:450});state.data.Attendance[0].course_id='hourly-course';state.data.Billing.push({id:'bill',attendance_id:state.data.Attendance[0].id,student_id:'demo-student-a',course_id:'hourly-course',session_id:'demo-session',minutes:36,rate_baht:450,amount_satang:27000,status:'unpaid',created_at:now()});`);
 await run('saveEditAttendance('+form('16:33','17:08')+')');
 assert.equal(run("byId('Billing','bill').minutes"),35);
 assert.equal(run("byId('Billing','bill').amount_satang"),26250);
 assert.equal(run("all('Ledger').filter(x=>x.type==='adjustment').length"),0);
 run("byId('Billing','bill').status='paid'");
 await assert.rejects(()=>run('saveEditAttendance('+form('16:33','17:09')+')'),/ชำระแล้ว/);
 console.log('PASS v2.4.2 clock-only editor; 35min, 90min, overnight, invalid, ledger +/- difference, repeat edit, unpaid hourly billing and paid protection');
})().catch(e=>{console.error(e);process.exitCode=1;});
