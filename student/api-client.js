/* AreWarin Student Portal — HTTPS API client for Cloudflare Worker -> Apps Script.
   NEVER put credentials, Sheet OAuth tokens, a Google service account, or Admin API secrets in GitHub Pages. */
'use strict';
const PortalBridge = (()=>{
 const endpoint = String(window.STUDENT_CONFIG?.apiEndpoint||'').trim();
 const allowed = new Set(['appConfig','activateAccount','loginStudent','logoutStudent','getMyData','submitPortalRequest','submitPaymentSlip']);
 const status=()=>document.getElementById('connection-status');
 const setStatus=(value,isError=false)=>{const el=status();if(!el)return;el.textContent=value;el.classList.toggle('offline',isError);};
 let url;
 try{url=new URL(endpoint);}catch{}
 if(!url || url.protocol!=='https:' || !/^[a-zA-Z0-9.-]+$/.test(url.hostname)){
  document.addEventListener('DOMContentLoaded',()=>setStatus('ตั้งค่า API ใน student/config.js ก่อน',true));
 }else{
  window.addEventListener('DOMContentLoaded',()=>{setStatus('เชื่อมต่อระบบ...',false);fetch(url.href,{method:'GET',cache:'no-store',referrerPolicy:'no-referrer'}).then(r=>{if(!r.ok)throw Error('API ไม่พร้อม');setStatus('พร้อมใช้งาน',false);}).catch(()=>setStatus('ไม่สามารถเชื่อม API — ตรวจ URL หรือสิทธิ์',true));});
 }
 return {async call(name,args=[]){
  if(!allowed.has(name))throw Error('คำสั่งไม่ได้รับอนุญาต');
  if(!url||url.protocol!=='https:')throw Error('กรุณาตั้งค่า API URL ใน student/config.js');
  const body=JSON.stringify({method:name,args});
  if(body.length>6*1024*1024)throw Error('ข้อมูลหรือสลิปเกินขนาดที่ระบบรองรับ');
  const controller=new AbortController();const tid=setTimeout(()=>controller.abort(),45000);
  try{
   let res;
   try{
    res=await fetch(url.href,{method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body,signal:controller.signal});
   }catch(e){
    setStatus('เชื่อมต่อ API ไม่สำเร็จ',true);
    throw Error(e?.name==='AbortError'?'การเชื่อมต่อหมดเวลา กรุณาลองใหม่':'เชื่อมต่อ API ไม่สำเร็จ ตรวจ Worker URL และเครือข่าย');
   }
   let out;
   try{out=await res.json();}catch{setStatus('API ตอบกลับผิดรูปแบบ',true);throw Error('API ส่งข้อมูลตอบกลับไม่ถูกต้อง ตรวจการ Deploy Apps Script');}
   if(!res.ok){setStatus('API ตอบกลับผิดพลาด',true);throw Error(String(out?.error||'เซิร์ฟเวอร์ตอบกลับผิดพลาด ('+res.status+')'));}
   // A rejected student code/invite/PIN is an AUTH error, NOT an API outage.
   setStatus('พร้อมใช้งาน',false);
   if(!out?.ok)throw Error(String(out?.error||'ไม่สามารถดำเนินการได้'));
   return out.result;
  }catch(e){throw e;}
  finally{clearTimeout(tid);}
 }};
})();
