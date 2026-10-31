const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const src=fs.readFileSync(__dirname+'/../student-portal/apps-script/StudentPortal.gs','utf8');
let seq=0,uploads=[];const store={
 Students:[{id:'S1',name:'น้อง A',full_name:'',school:'',grade_level:'ม.5',status:'active'},{id:'S2',name:'น้อง B',full_name:'',school:'',grade_level:'ม.6',status:'active'}],
 PortalAccounts:[{id:'ACC1',student_id:'S1',student_code:'26-0001',activation_hash:'',pin_hash:'hashed:1234',pin_salt:'salt',attempts:0,status:'active',locked_until:'',pin_set_at:'2026-10-30'}],PortalSessions:[{id:'SESSION1',student_id:'S1',token_hash:crypto.createHash('sha256').update('T'.repeat(96)).digest('hex'),expires_at:'2030-01-01T00:00:00.000Z',revoked:'no'}],
 Courses:[{id:'C1',student_id:'S1',title:'Biology',cycle_no:1,status:'active',purchased_minutes:'600',billing_mode:'package'},{id:'C2',student_id:'S2',title:'Private Course',cycle_no:1,status:'active',purchased_minutes:'999',billing_mode:'package'}],
 Ledger:[{id:'L1',student_id:'S1',course_id:'C1',minutes:'600'},{id:'L2',student_id:'S1',course_id:'C1',minutes:'-35'},{id:'L3',student_id:'S2',course_id:'C2',minutes:'999'}],
 Sessions:[{id:'SESSIONA',date:'2026-10-26',start_time:'16:33',end_time:'17:08'}],
 Attendance:[{id:'AT1',student_id:'S1',course_id:'C1',session_id:'SESSIONA',status:'approved',join_time:'16:33',leave_time:'17:08',deduct_minutes:'35'},{id:'AT2',student_id:'S2',course_id:'C2',session_id:'SESSIONA',status:'approved',deduct_minutes:'80'}],
 Billing:[{id:'B1',student_id:'S1',course_id:'C1',attendance_id:'AT1',amount_satang:'90000',minutes:'90',status:'unpaid',session_id:'SESSIONA'}],Payments:[],
 Groups:[],Schedules:[],LeaveRecords:[],MakeupCredits:[],LessonNotes:[],PortalRequests:[],PortalNotifications:[],Audit:[{id:'A',details:'PRIVATE EDIT LOG'}]
};
const ctx={console,Date,Number,JSON,String,Math,Array,Object,Error,RegExp,PropertiesService:{getScriptProperties:()=>({getProperty:()=>"secret"})},Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++seq).padStart(12,"0")}`,computeDigest:(algo,v)=>[...crypto.createHash('sha256').update(v).digest()].map(x=>x>127?x-256:x),DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},formatDate:()=>"2026-10-31T15:31:00",base64Decode:(s)=>[...Buffer.from(s,'base64')].map(x=>x>127?x-256:x),newBlob:(_,mime,name)=>({mime,name})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},DriveApp:{getFolderById:()=>({createFile:blob=>{uploads.push(blob);return {getId:()=>"FILE1",setDescription(){}}}})}};
vm.createContext(ctx);vm.runInContext(src,ctx);ctx.records_=(name)=>store[name]?.map((r,i)=>({...r,_row:i+2}))||[];ctx.append_=(name,obj)=>{(store[name]??=[]).push({...obj});};ctx.patch_=(name,obj,changes)=>Object.assign(store[name][obj._row-2],changes);ctx.pinHash_=pin=>`hashed:${pin}`;
const token='T'.repeat(96);const data=ctx.getMyData(token);
assert.equal(data.student.name,'น้อง A');assert.equal(data.courses.length,1);assert.equal(data.attendance.length,1);assert.equal(data.courses[0].balance,565);
assert.ok(!JSON.stringify(data).includes('PRIVATE EDIT LOG'));assert.ok(!('audit' in data));assert.ok(!('pin_hash' in data.student));
assert.throws(()=>ctx.submitPortalRequest(token,{kind:'renew',courseId:'C2'}),/ไม่พบคอร์ส/);
assert.throws(()=>ctx.submitPortalRequest('badtoken',{kind:'renew',courseId:'C1'}),/กรุณาเข้าสู่ระบบ/);
let req=ctx.submitPortalRequest(token,{kind:'renew',courseId:'C1',note:'อีก 10 ชั่วโมง'});assert.equal(req.status,'pending');assert.equal(store.PortalRequests.length,1);assert.equal(store.PortalRequests[0].student_id,'S1');
assert.throws(()=>ctx.submitPortalRequest(token,{kind:'renew',courseId:'C1'}),/ระหว่างตรวจสอบ/);
assert.throws(()=>ctx.loginStudent('26-0001','9999'),/ไม่สามารถเข้าสู่ระบบ/);assert.equal(store.PortalAccounts[0].attempts,1);
assert.ok(ctx.loginStudent('26-0001','1234').token.length>=64);
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(50,3)]);
const pay=ctx.submitPaymentSlip(token,{billingId:'B1',amountBaht:450,mime:'image/png',base64:png.toString('base64')});assert.equal(pay.status,'pending');assert.equal(uploads.length,1);assert.equal(store.Payments.length,0);assert.equal(store.PortalRequests.find(r=>r.id===pay.id).amount_satang,45000);
assert.throws(()=>ctx.submitPaymentSlip(token,{billingId:'B1',amountBaht:450,mime:'image/png',base64:png.toString('base64')}),/กำลังรอตรวจสอบ/);
console.log('PASS: student isolation, final time-only, request validation, PIN lockout, slip pending/no auto-payment');
