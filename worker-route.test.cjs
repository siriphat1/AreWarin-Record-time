const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const code=fs.readFileSync(path.join(__dirname,'../cloudflare-worker/worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(code))).default;
 const prev=global.fetch;let forwarded;
 global.fetch=async (url,opts)=>{forwarded=JSON.parse(opts.body);return new Response(JSON.stringify({ok:true,result:{token:'unit'}}),{status:200,headers:{'Content-Type':'application/json'}})};
 const origin='https://siriphat1.github.io';const headers={'Origin':origin,'Content-Type':'application/json'};
 const env={PUBLIC_ORIGIN:origin,GAS_URL:'https://script.google.com/macros/s/unit/exec'};
 const req=new Request('https://worker.test/',{method:'POST',headers,body:JSON.stringify({method:'activateWithPhone',args:['26-0003','0812345678','123456','1234','1234']})});
 const response=await worker.fetch(req,env);
 assert.equal(response.status,200);assert.equal(forwarded.args.length,5);
 assert.equal((await response.json()).result.token,'unit');
 const forbidden=await worker.fetch(new Request('https://worker.test/',{method:'POST',headers,body:JSON.stringify({method:'adminDeleteStudent',args:[]})}),env);
 assert.equal(forbidden.status,400);global.fetch=prev;console.log('PASS: Worker relays 5-argument OTP activation; admin methods rejected');
})().catch(e=>{console.error(e);process.exit(1)});
