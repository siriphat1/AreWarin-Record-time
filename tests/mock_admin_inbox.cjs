'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../tutor-os/index.html','utf8');
const start=html.indexOf('let awSlipSyncRunning=false;');
const end=html.indexOf('setInterval(()=>',start);
assert(start>0 && end>start,'admin sync code not found');
const js=html.slice(start,end);
const headers=['id','student_id','kind','course_id','schedule_id','attendance_id','amount_satang','slip_file_id','slip_name','date','target_date','target_time','note','status','admin_note','handled_at','approved_payment_id','created_at','updated_at'];
let sample=['receipt-123','student-1','payment','course-1','','attendance-1','40000','drive-1','slip.png','','','','','pending','','','','2026-11-02T12:00:00','2026-11-02T12:00:00'];
let result={values:[headers,sample]};
const toasts=[];
const ctx={console,Date,encodeURIComponent,document:{visibilityState:'visible'},window:{},
 state:{mode:'live',busy:false,view:'billing',data:{PortalRequests:[]}},
 store:{request:async()=>result},
 awSlipSyncState:{phase:'not-checked',lastAt:0,total:0,error:''},
 SCHEMA:{PortalRequests:headers},
 all(name){return ctx.state.data[name]||[]},
 awSlipRows(){return ctx.state.data.PortalRequests.filter(r=>r.kind==='payment'&&r.status==='pending')},
 render(){},awRefreshBadges(){},toast(message){toasts.push(message)},notice(e){toasts.push('Error: '+e.message)}
};
vm.createContext(ctx);vm.runInContext(js,ctx);
(async()=>{
 let good=await ctx.awSyncPortalRequests({quiet:true});
 assert.strictEqual(good,true);
 assert.strictEqual(ctx.state.data.PortalRequests.length,1);
 assert.strictEqual(ctx.state.data.PortalRequests[0].status,'pending');
 assert.strictEqual(ctx.awSlipSyncState.phase,'ready');
 assert(toasts.some(s=>s.includes('มีสลิปใหม่')));
 result={values:[['id','student_id','kind','status'],['x','s','payment','pending']]};
 let failed=await ctx.awSyncPortalRequests({quiet:true});
 assert.strictEqual(failed,false);
 assert.strictEqual(ctx.awSlipSyncState.phase,'error');
 assert.strictEqual(ctx.state.data.PortalRequests.length,1,'preserve last known data on sync failure');
 console.log('PASS: pending inbox, new slip alert, missing columns visible as sync error, preserve previous rows');
})().catch(e=>{console.error(e);process.exit(1)});
