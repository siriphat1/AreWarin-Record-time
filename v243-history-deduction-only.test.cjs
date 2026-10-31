const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const memory=new Map();
const ctx=vm.createContext({window:{TUTOR_CONFIG:{}},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},crypto:globalThis.crypto,console,Date,Math,Number,Map,Set,String,JSON,Promise});
vm.runInContext(source,ctx);
const run=expression=>vm.runInContext(expression,ctx);
run(`state.data=makeDemo();state.mode='demo';state.historyLayout='table';state.historyStudent='';state.historyCourse='';`);
let html=run('learningHistory()');
assert(!html.includes('ชั่วโมงสอนตามช่วงเวลา'));
assert(!html.includes('<th>ชั่วโมงสอน</th>'));
assert(html.includes('<small>ชั่วโมงที่ตัด</small><strong>2 ชม.</strong>'));
assert.equal((html.match(/<th>ชั่วโมงที่ตัด<\/th>/g)||[]).length,1);
// A cancelled student within an approved group session must never increase the deducted total.
run(`state.data.Attendance.push({id:'cancelled-a',session_id:'demo-session',student_id:'demo-student-b',course_id:'demo-course-b',actual_minutes:50,deduct_minutes:50,status:'cancelled'});
state.data.Attendance.push({id:'approved-b',session_id:'demo-session',student_id:'demo-student-b',course_id:'demo-course-b',actual_minutes:40,deduct_minutes:40,status:'approved'});`);
html=run('learningHistory()');
assert(html.includes('<small>ชั่วโมงที่ตัด</small><strong>2 ชม. 40 นาที</strong>'));
// A student/course filter must restrict the hour total, not just session rows.
run("state.historyStudent='demo-student-b';state.historyCourse='demo-course-b';");
html=run('learningHistory()');
assert(html.includes('<small>ชั่วโมงที่ตัด</small><strong>40 นาที</strong>'));
assert(!html.includes('2 ชม. 40 นาที'));
// Day view should show the deducted minutes too, rather than tutor clock duration.
run("state.historyLayout='day'");
html=run('learningHistory()');
assert(html.includes('1 คาบ · ตัด 40 นาที'));
assert(!html.includes('ชั่วโมงสอนตามช่วงเวลา'));
// Pending sessions do not contribute to deducted totals.
run("state.data.Sessions[0].status='pending'");
html=run('learningHistory()');
assert(html.includes('<small>ชั่วโมงที่ตัด</small><strong>0 นาที</strong>'));
assert(!html.includes('1 คาบ · ตัด 40 นาที'));
console.log('PASS v2.4.3 history shows deducted hours only, respects student/course filters, excludes cancelled and pending, day/table');
