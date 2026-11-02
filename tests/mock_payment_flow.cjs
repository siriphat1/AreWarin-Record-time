'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../apps-script/PortalExtension.gs','utf8');
const data={
 Billing:[{id:'bill-1',student_id:'student-A',course_id:'course-1',attendance_id:'attendance-1',amount_satang:'40000'}],
 PortalRequests:[{id:'receipt-1',student_id:'student-A',course_id:'course-1',attendance_id:'attendance-1',kind:'payment',status:'pending',slip_file_id:'drive-file-1',amount_satang:'40000',created_at:'2026-11-02T12:00:00'}],
 PortalNotifications:[],
};
const heads={
 PortalRequests:['id','student_id','kind','course_id','attendance_id','amount_satang','slip_file_id','status','created_at'],
 Billing:['id','student_id','course_id','attendance_id','amount_satang'],
 Payments:['id','billing_id','amount_satang'],
 PortalNotifications:['id','student_id','title','read_at']
};
const fakeSpreadsheet={
 getId(){return 'same-id'},getName(){return 'Mock'},
 getSheetByName(name){
  if(!(name in heads))return null;
  return {getLastColumn(){return heads[name].length},getRange(){return {getDisplayValues(){return [heads[name]]}}}};
 }
};
const ctx={console,Logger:{log(){}},
 PropertiesService:{getScriptProperties(){return {getProperty(){return 'mock-id'},setProperty(){}}}},
 SpreadsheetApp:{openById(){return fakeSpreadsheet}}
};
vm.createContext(ctx);vm.runInContext(source,ctx);
ctx.awRequireStudent_=(token)=>token==='token-A'?'student-A':token==='token-B'?'student-B':(()=>{throw Error('Invalid token')})();
ctx.awRows_=(sheet)=>data[sheet]||[];
ctx.awAppend_=(sheet,row)=>{data[sheet]??=[];data[sheet].push(row)};
ctx.awNow_=()=> '2026-11-02T12:01:00';
ctx.Utilities={getUuid(){return 'notice-1'}};
assert.strictEqual(ctx.awGetPaymentStatus('token-A','bill-1').found,true,'owner must see own receipt');
assert.strictEqual(ctx.awGetPaymentStatus('token-A','bill-1').hasFile,true);
assert.throws(()=>ctx.awGetPaymentStatus('token-B','bill-1'),/ไม่พบค่าคาบ/,'other students must not read receipt');
assert.throws(()=>ctx.awGetPaymentStatus('token-A','wrong-bill'),/ไม่พบค่าคาบ/);

const original=data.PortalRequests.slice();
ctx.submitPaymentSlip=()=>({id:'receipt-1',status:'pending'});
ctx.awRows_=(sheet)=>data[sheet]||[];
const accepted=ctx.awSubmitPaymentSlipV2('token-A',{billingId:'bill-1'});
assert.strictEqual(accepted.adminVisible,true,'receipt is visible in shared spreadsheet');
assert.strictEqual(accepted.noticeSent,true,'student acknowledgement is appended');
assert.strictEqual(data.PortalNotifications.length,1);
data.PortalRequests=[];
const absent=ctx.awSubmitPaymentSlipV2('token-A',{billingId:'bill-1'});
assert.strictEqual(absent.adminVisible,false,'mismatched spreadsheet must not be shown as admin-visible');
assert.strictEqual(absent.noticeSent,false,'no false notification acknowledgement');
assert.ok(absent.warning,'return warning after receipt was saved');
// Read-only payment status must not cross accounts even with a known receipt id.
assert.strictEqual(ctx.awGetPaymentStatus('token-A','bill-1').found,false);
console.log('PASS: ownership, positive status, missing status, acknowledgement, mismatch warning');
