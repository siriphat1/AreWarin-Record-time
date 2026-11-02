'use strict';
const fs=require('fs'),assert=require('assert');
const r=__dirname+'/../';
const ext=fs.readFileSync(r+'apps-script/PortalExtension.gs','utf8');
const worker=fs.readFileSync(r+'cloudflare-worker/worker.js','utf8');
const client=fs.readFileSync(r+'student/api-client.js','utf8');
const must=['awGetExtras','awSendChat','awMarkNotice','awClearNotices','awLoginWithData','awSubmitPaymentSlipV2','awGetPaymentStatus'];
for(const n of must){assert(worker.includes("'"+n+"'"),'worker '+n);assert(client.includes("'"+n+"'"),'student '+n);assert(ext.includes("case '"+n+"':"),'appsscript '+n)}
const markup=fs.readFileSync(r+'student/app.js','utf8');
assert(markup.includes("const receipt=await rpc('awSubmitPaymentSlipV2'"),'v2 payment route');
assert(!markup.includes("receipt=await rpc('submitPaymentSlip',app.token,payload)"),'unsafe legacy upload retry not allowed');
assert(markup.includes("awGetPaymentStatus"),'recovery query');
assert(worker.includes('Access-Control-Allow-Origin'),'CORS');
console.log('PASS: 7 methods aligned across frontend/worker/extension; no silent legacy financial fallback');
console.log('NOTE: production doPost(e) is NOT included/verified; must be configured separately');
