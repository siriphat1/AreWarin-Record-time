const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const path=__dirname+'/../tutor-os/assets/';const mem=new Map();
class FakeFormData{constructor(form){this.v=form.values||{}}get(k){return this.v[k]||'';}}
const ctx=vm.createContext({window:{TUTOR_CONFIG:{}},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},crypto:crypto.webcrypto,TextEncoder,Uint8Array,DataView,CSS:{escape:x=>x},FormData:FakeFormData,console,Date,Math,Map,Set,Number,String,JSON,Promise,confirm:()=>true});
vm.runInContext(fs.readFileSync(path+'app.js','utf8'),ctx);vm.runInContext(fs.readFileSync(path+'portal-manager.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};closeModal=()=>{};toast=()=>{};showBusy=()=>{};hideBusy=()=>{};store=new DemoStore();state.mode="demo";state.data=makeDemo();');
mem.set('awtutor_v1_demo',JSON.stringify(run('state.data')));
(async()=>{ctx.f={values:{'student-name':'น้อง P','student-status':'active','student-hourly-rate':'450'}};run('portalInviteModal=()=>{}');await run('saveStudent(f)');const account=run('all("PortalAccounts")[0]');assert(account.student_code.match(/^\d{2}-\d{4}$/));assert(account.activation_hash.match(/^[0-9a-f]{64}$/));assert.equal(account.pin_hash,'');assert.equal(run('all("Students").find(x=>x.id==="'+account.student_id+'").name'),'น้อง P');console.log('PASS: new student auto-generates compact ID and one-time invitation hash');})().catch(e=>{console.error(e);process.exit(1)});
