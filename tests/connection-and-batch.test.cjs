const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
const ls=new Map(),ss=new Map();
const store=(map)=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)});
const nodes={
 '#connection-client':{value:'12345-abc.apps.googleusercontent.com'},
 '#connection-sheet':{value:'https://docs.google.com/spreadsheets/d/1FAKE_SPREADSHEET_ABC1234567/edit'},
 '#app':{},
 '#excel-dropzone':{classList:{add(){},remove(){}}},
};
const ctx=vm.createContext({
 window:{TUTOR_CONFIG:{},localStorage:store(ls),sessionStorage:store(ss)},
 document:{readyState:'loading',addEventListener(){},querySelector:selector=>nodes[selector]||null,getElementById:()=>null},
 localStorage:store(ls),crypto:globalThis.crypto,console,Date,Math,Map,Set,Number,String,JSON,Promise,confirm:()=>true,
});
vm.runInContext(source,ctx);
const run=x=>vm.runInContext(x,ctx);
run('render=()=>{};closeModal=()=>{};toast=()=>{};store=new DemoStore();state.data=makeDemo()');
(async()=>{
 assert.equal(run('state.mode'),'setup_required');
 run('saveConnection()');
 assert.equal(run('state.mode'),'needs_login');
 assert.equal(run('config.spreadsheetId'),'1FAKE_SPREADSHEET_ABC1234567');
 assert.equal(JSON.parse(ls.get('awtutor_connection_settings_v1')).googleClientId,'12345-abc.apps.googleusercontent.com');
 // Simulate a Google token already obtained in THIS tab; app should restore on refresh.
 run('rememberGoogleSession("test-token",3600)');
 run('SheetsStore.prototype.load=async function(){return makeDemo()}');
 assert.equal(await run('restoreGoogleSession()'),true);
 assert.equal(run('state.mode'),'live');
 assert.equal(run('state.token'),'test-token');
 // Expired session may never be reused.
 const record=JSON.parse(ss.get('awtutor_google_session_v1'));
 record.expiresAt=1;ss.set('awtutor_google_session_v1',JSON.stringify(record));
 assert.equal(await run('restoreGoogleSession()'),false);
 assert.equal(run('state.mode'),'needs_login');
 assert.equal(ss.has('awtutor_google_session_v1'),false);
 // Read multiple files as one batch; duplicate content is warned and never silently saved.
 run(`state.mode='demo';state.view='import';state.importQueue=[];state.importDrafts=[];state.importErrors=[];state.importDone=[];state.importDraft=null;parseExcelFile=async file=>({filename:file.name,fingerprint:file.fp,date:'2026-10-28',tutorIndex:0,people:[]});loadCurrentImport=()=>{};`);
 const files=[{name:'meet-a.xlsx',size:15,fp:'one'},{name:'meet-b.xlsx',size:15,fp:'two'},{name:'meet-again.xlsx',size:15,fp:'one'}];
 ctx.filesToTest=files;
 await run('prepareImportBatch(filesToTest)');
 assert.equal(run('state.importQueue.length'),3);
 assert.equal(run('state.importDrafts.filter(Boolean).length'),2);
 assert.equal(run("state.importDone[2]"),'duplicate');
 // Drop anywhere in import page, not only in dashed zone.
 let prevented=false;
 ctx.dropEvent={type:'drop',dataTransfer:{types:['Files'],files:[{name:'meet-c.csv',size:5,fp:'three'}]},preventDefault(){prevented=true;}};
 await run('onFileDrag(dropEvent)');
 assert.equal(prevented,true);
 assert.equal(run('state.importQueue.length'),4);
 console.log('PASS connection setup, cached config, session restore, expiry, multi-file, duplicate, page-wide drop');
})().catch(e=>{console.error(e);process.exit(1)});
