/** AreWarin Student Portal: Cloudflare Worker CORS relay. No PIN/session/password is stored.
 * Deploy separately on Cloudflare Workers. Secret GAS_URL is the Apps Script /exec URL.
 * Variable PUBLIC_ORIGIN is the exact GitHub Pages origin e.g. https://USERNAME.github.io.
 */
const ALLOWED = new Set(['appConfig','activateAccount','requestPhoneOtp','activateWithPhone','loginStudent','logoutStudent','getMyData','submitPortalRequest','submitPaymentSlip']);
const json=(data,status,origin='')=>new Response(JSON.stringify(data),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
}});
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const wanted=String(env.PUBLIC_ORIGIN||'').replace(/\/$/,'');
  const allowOrigin=origin && wanted && origin===wanted?origin:'';
  if(request.method==='OPTIONS'){
   if(!allowOrigin)return new Response(null,{status:403});
   return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Origin':allowOrigin,'Access-Control-Allow-Methods':'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers':'content-type','Access-Control-Max-Age':'600','Vary':'Origin'
   }});
  }
  if(request.method==='GET')return json({ok:true,service:'AreWarin Student Portal API',configured:!!env.GAS_URL && !!wanted},200,allowOrigin);
  if(request.method!=='POST')return json({ok:false,error:'Method not allowed'},405,allowOrigin);
  if(!allowOrigin)return json({ok:false,error:'Origin not allowed'},403);
  if(!env.GAS_URL||!String(env.GAS_URL).startsWith('https://script.google.com/macros/s/'))return json({ok:false,error:'GAS_URL secret not set'},503,allowOrigin);
  if(Number(request.headers.get('content-length')||0)>6*1024*1024)return json({ok:false,error:'Request too large'},413,allowOrigin);
  try{
   const raw=await request.text();if(raw.length>6*1024*1024)return json({ok:false,error:'Request too large'},413,allowOrigin);
   const obj=JSON.parse(raw);
   if(!obj||!ALLOWED.has(obj.method)||!Array.isArray(obj.args)||obj.args.length>5)return json({ok:false,error:'Bad request'},400,allowOrigin);
   const response=await fetch(env.GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({method:obj.method,args:obj.args}),redirect:'follow'});
   if(!response.ok)return json({ok:false,error:'Google Apps Script unavailable ('+response.status+')'},502,allowOrigin);
   const text=await response.text();if(text.length>7*1024*1024)return json({ok:false,error:'Response too large'},502,allowOrigin);
   let payload;try{payload=JSON.parse(text);}catch{return json({ok:false,error:'Apps Script returned non-JSON; check deployment permissions and URL'},502,allowOrigin);}
   return json(payload,200,allowOrigin);
  }catch(e){return json({ok:false,error:'API gateway error; check Cloudflare logs and Apps Script deployment'},502,allowOrigin);}
 }
};
