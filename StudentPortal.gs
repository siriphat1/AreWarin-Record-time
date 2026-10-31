/**
 * AreWarin Student Portal v1.0 — bound Google Apps Script; SAME PRIVATE spreadsheet as Tutor OS.
 * Deploy as HTML-service Web App: Execute as ME, access ANYONE (with link).
 * Public-facing functions MUST authenticate by a server-side session; all helper functions end in _.
 * Never disclose audit logs, source join/leave times, edit history, or other students' data.
 */
var PORTAL_HEADERS = {
  PortalAccounts:['id','student_id','student_code','activation_hash','pin_hash','pin_salt','pin_set_at','attempts','locked_until','status','created_at','updated_at','last_login_at'],
  PortalSessions:['id','student_id','token_hash','expires_at','revoked','created_at','updated_at'],
  PortalRequests:['id','student_id','kind','course_id','schedule_id','attendance_id','amount_satang','slip_file_id','slip_name','date','target_date','target_time','note','status','admin_note','handled_at','approved_payment_id','created_at','updated_at'],
  PortalNotifications:['id','student_id','title','message','read_at','created_at']
};
var PORTAL_SLIP_FOLDER_ID = '1-m5qRJXsTm4Zzh92hsSqi5gHQV-2nhEV';
var PORTAL_TZ = 'Asia/Bangkok';
var PORTAL_BANK = {recipientName:'กวดวิชาชีววิทยา อาวริน', promptpayId:'1901001151577', bank:'กรุงไทย', bankAccount:'664-343-6974'};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Student').setTitle('AreWarin | My Learning')
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
}
function setupStudentPortal_() {
  // MUST be run from Apps Script editor by the spreadsheet owner; not exposed as a web UI.
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw Error('Bind Apps Script to the Tutor OS Spreadsheet first.');
  Object.keys(PORTAL_HEADERS).forEach(function(name){
    var sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);
    var headers=PORTAL_HEADERS[name];var actual=sh.getLastRow()?sh.getRange(1,1,1,headers.length).getDisplayValues()[0]:[];
    if(actual.some(function(x){return x!=='';})){
      if(headers.some(function(x,i){return x!==actual[i];}))throw Error('Unexpected header in '+name+' — do not overwrite existing data');
    }else{sh.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#174D3C').setFontColor('#FFFFFF').setFontWeight('bold');sh.setFrozenRows(1);}
  });
  var props=PropertiesService.getScriptProperties();
  if(!props.getProperty('PORTAL_PEPPER'))props.setProperty('PORTAL_PEPPER',randomToken_(4));
  Logger.log('Portal sheets ready. DO NOT publish the spreadsheet.');
}
function appConfig(){return {name:'AreWarin Student Portal',recipientName:PORTAL_BANK.recipientName,promptpayId:PORTAL_BANK.promptpayId,bank:PORTAL_BANK.bank,bankAccount:PORTAL_BANK.bankAccount};}
function sheet_(name){var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!sh)throw Error('Missing sheet '+name+'; run setupStudentPortal_ from Apps Script editor');return sh;}
function records_(name){var sh=sheet_(name),n=sh.getLastRow();if(n<2)return [];var headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
 return sh.getRange(2,1,n-1,headers.length).getDisplayValues().map(function(a,i){var obj={_row:i+2};headers.forEach(function(h,j){obj[h]=String(a[j]||'');});return obj;}).filter(function(x){return x.id;});}
function append_(name,obj){var sh=sheet_(name),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];sh.appendRow(headers.map(function(h){var value=obj[h]===undefined?'':obj[h];if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(value))return '\''+value;return value;}));}
function patch_(name,obj,changes){var sh=sheet_(name),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];Object.keys(changes).forEach(function(k){var i=headers.indexOf(k);if(i<0)throw Error('Missing column '+k);sh.getRange(obj._row,i+1).setValue(changes[k]);});}
function now_(){return Utilities.formatDate(new Date(),PORTAL_TZ,"yyyy-MM-dd'T'HH:mm:ss");}
function id_(){return Utilities.getUuid();}
function randomToken_(count){return Array(count||2).fill(0).map(function(){return Utilities.getUuid().replace(/-/g,'');}).join('');}
function hash_(str){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(str),Utilities.Charset.UTF_8).map(function(x){return ('0'+(x&255).toString(16)).slice(-2);}).join('');}
function pinHash_(pin,salt){var pepper=PropertiesService.getScriptProperties().getProperty('PORTAL_PEPPER');if(!pepper)throw Error('Run setupStudentPortal first');var v=salt+':'+pin+':'+pepper;for(var i=0;i<750;i++)v=hash_(v);return v;}
function authError_(){throw Error('ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบรหัสหรือ PIN');}
function codeAccount_(code){return records_('PortalAccounts').filter(function(a){return a.student_code===String(code||'').trim().toUpperCase()&&a.status==='active';})[0]||null;}
function requireSession_(token){if(!token||typeof token!=='string'||token.length<60)throw Error('กรุณาเข้าสู่ระบบใหม่');
 var digest=hash_(token),session=records_('PortalSessions').filter(function(s){return s.token_hash===digest&&s.revoked!=='yes';})[0];
 if(!session||new Date(session.expires_at).getTime()<=Date.now())throw Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
 var account=records_('PortalAccounts').filter(function(a){return a.student_id===session.student_id&&a.status==='active'&&a.pin_hash;})[0];
 if(!account)throw Error('บัญชีไม่พร้อมใช้งาน');return account.student_id;
}
function lockLogin_(account){var attempts=(Number(account.attempts)||0)+1;var until=attempts>=5?new Date(Date.now()+30*60*1000).toISOString():'';patch_('PortalAccounts',account,{attempts:attempts,locked_until:until,updated_at:now_()});}
function checkLock_(account){if(account.locked_until&&Date.parse(account.locked_until)>Date.now())throw Error('ลองรหัสหลายครั้งเกินไป กรุณารอ 30 นาทีหรือติดต่อผู้ดูแล');}
function activateAccount(code,activationKey,pin,confirmPin){
 if(!/^\d{4}$/.test(String(pin))||pin!==confirmPin)throw Error('ตั้ง PIN ตัวเลข 4 หลักและยืนยันให้ตรงกัน');
 var lock=LockService.getScriptLock();lock.waitLock(20000);try{
  var a=codeAccount_(code);if(!a||a.pin_hash||!activationKey||String(activationKey).length<24)authError_();checkLock_(a);
  if(hash_(a.student_code+':'+activationKey)!==a.activation_hash){lockLogin_(a);authError_();}
  var salt=randomToken_(1);patch_('PortalAccounts',a,{pin_hash:pinHash_(pin,salt),pin_salt:salt,pin_set_at:now_(),activation_hash:'',attempts:0,locked_until:'',updated_at:now_()});return issueSession_(a.student_id);
 }finally{lock.releaseLock();}
}
function issueSession_(sid){var token=randomToken_(3),now=new Date();append_('PortalSessions',{id:id_(),student_id:sid,token_hash:hash_(token),expires_at:new Date(now.getTime()+24*3600*1000).toISOString(),revoked:'no',created_at:now_(),updated_at:now_()});return {token:token,expiresAt:new Date(now.getTime()+24*3600*1000).toISOString()};}
function loginStudent(code,pin){var lock=LockService.getScriptLock();lock.waitLock(20000);try{
 var a=codeAccount_(code);if(!a||!a.pin_hash||!/^\d{4}$/.test(String(pin)))authError_();checkLock_(a);
 if(pinHash_(pin,a.pin_salt)!==a.pin_hash){lockLogin_(a);authError_();}
 patch_('PortalAccounts',a,{attempts:0,locked_until:'',last_login_at:now_()});return issueSession_(a.student_id);
 }finally{lock.releaseLock();}}
function logoutStudent(token){var hash=hash_(token||'');records_('PortalSessions').filter(function(s){return s.token_hash===hash;}).forEach(function(s){patch_('PortalSessions',s,{revoked:'yes',updated_at:now_()});});return true;}
function getMyData(token){var sid=requireSession_(token);
 var s=records_('Students').filter(function(x){return x.id===sid;})[0];if(!s||s.status==='deleted')throw Error('ไม่พบข้อมูลนักเรียน');
 var courses=records_('Courses').filter(function(c){return c.student_id===sid;});
 var ledgers=records_('Ledger').filter(function(l){return l.student_id===sid;});
 var attend=records_('Attendance').filter(function(a){return a.student_id===sid&&a.status==='approved';});
 var sessions=records_('Sessions'),sessMap={};sessions.forEach(function(x){sessMap[x.id]=x;});
 var courseMap={};courses.forEach(function(c){courseMap[c.id]=c;});
 var billing=records_('Billing').filter(function(b){return b.student_id===sid&&b.status!=='cancelled';});
 var payments=records_('Payments'),paid={};payments.forEach(function(p){paid[p.billing_id]=(paid[p.billing_id]||0)+Number(p.amount_satang||0);});
 var groups=records_('Groups').filter(function(g){return ('|'+g.member_ids+'|').indexOf('|'+sid+'|')>=0;}).map(function(g){return g.id;});
 var schedules=records_('Schedules').filter(function(sc){return sc.status==='active'&&(sc.student_id===sid||groups.indexOf(sc.group_id)>=0);});
 var leave=records_('LeaveRecords').filter(function(l){return l.student_id===sid;});
 var makeup=records_('MakeupCredits').filter(function(m){return m.student_id===sid;});
 var requests=records_('PortalRequests').filter(function(r){return r.student_id===sid;});
 var lessonNotes=records_('LessonNotes').filter(function(n){return n.student_id===sid;});
 return {
  student:{name:s.name,fullName:s.full_name,school:s.school,grade:s.grade_level,status:s.status,code:records_('PortalAccounts').filter(function(a){return a.student_id===sid;})[0].student_code},
  courses:courses.map(function(c){var balance=ledgers.filter(function(l){return l.course_id===c.id;}).reduce(function(v,l){return v+Number(l.minutes||0);},0);var actual=attend.filter(function(a){return a.course_id===c.id;}).reduce(function(v,a){return v+Number(a.deduct_minutes||0);},0);return {id:c.id,title:c.title,cycle:Number(c.cycle_no)||1,status:c.status,mode:c.billing_mode||'package',rate:Number(c.hourly_rate_baht)||0,purchased:Number(c.purchased_minutes)||0,used:actual,balance:balance,startDate:c.start_date};}),
  attendance:attend.map(function(a){var s=sessMap[a.session_id]||{};return {id:a.id,courseId:a.course_id,course:courseMap[a.course_id]?.title||'',date:s.date||'',start:a.join_time||s.start_time||'',end:a.leave_time||s.end_time||'',minutes:Number(a.deduct_minutes)||0};}).sort(function(a,b){return (b.date+' '+b.start).localeCompare(a.date+' '+a.start);}),
  schedule:schedules.map(function(sc){return {id:sc.id,date:sc.date,start:sc.start_time,end:sc.end_time,repeat:sc.repeat_rule,kind:sc.group_id?'group':'private',groupId:sc.group_id,course:courseMap[sc.course_id]?.title||'',tutor:sc.tutor};}),
  billing:billing.map(function(b){return {id:b.id,courseId:b.course_id,course:courseMap[b.course_id]?.title||'',minutes:Number(b.minutes)||0,amount:Number(b.amount_satang)||0,paid:paid[b.id]||0,date:sessMap[b.session_id]?.date||''};}),
  leave:leave.map(function(l){return {id:l.id,kind:l.kind,startDate:l.start_date,endDate:l.end_date,expectedReturn:l.expected_return,status:l.status};}),
  makeup:makeup.map(function(m){return {id:m.id,courseId:m.course_id,originDate:m.origin_date,scheduledDate:m.scheduled_date,start:m.start_time,end:m.end_time,minutes:Number(m.planned_minutes)||0,status:m.status};}),
  requests:requests.map(function(r){return {id:r.id,kind:r.kind,status:r.status,courseId:r.course_id,date:r.date,targetDate:r.target_date,amount:Number(r.amount_satang)||0,createdAt:r.created_at,adminNote:r.admin_note||''};}).sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);}),
  lessonNotes:lessonNotes.map(function(n){return {title:n.title,homework:n.homework,createdAt:n.created_at,courseId:n.course_id};}),
  bank:PORTAL_BANK
 };
}
function validateRequest_(sid,input){var kind=String(input.kind||'');if(['renew','new_course','leave','pause','makeup','attendance_review','class_confirm'].indexOf(kind)<0)throw Error('ประเภทคำขอไม่ถูกต้อง');
 var courseId=String(input.courseId||''),scheduleId=String(input.scheduleId||''),attendanceId=String(input.attendanceId||'');
 if(courseId&&!records_('Courses').some(function(c){return c.id===courseId&&c.student_id===sid;}))throw Error('ไม่พบคอร์สที่เลือก');
 if(attendanceId&&!records_('Attendance').some(function(a){return a.id===attendanceId&&a.student_id===sid;}))throw Error('ไม่พบคาบเรียนที่เลือก');
 if(scheduleId&&!records_('Schedules').some(function(s){return s.id===scheduleId&&(s.student_id===sid||records_('Groups').some(function(g){return g.id===s.group_id&&('|'+g.member_ids+'|').indexOf('|'+sid+'|')>=0;}));}))throw Error('ไม่พบตารางเรียน');
 var target=String(input.targetDate||'');if(target&&!/^\d{4}-\d{2}-\d{2}$/.test(target))throw Error('รูปแบบวันที่ไม่ถูกต้อง');
 var note=String(input.note||'').trim().slice(0,800);if(!note&&kind==='attendance_review')throw Error('กรุณาระบุรายละเอียดที่ต้องการให้ตรวจสอบ');
 return {kind:kind,course_id:courseId,schedule_id:scheduleId,attendance_id:attendanceId,target_date:target,target_time:String(input.targetTime||'').slice(0,12),note:note,date:String(input.date||'').slice(0,10)};
}
function submitPortalRequest(token,input){var sid=requireSession_(token);if(!input||typeof input!=='object')throw Error('กรอกคำขอ');
 var data=validateRequest_(sid,input);var l=LockService.getScriptLock();l.waitLock(20000);try{
 var existing=records_('PortalRequests').some(function(r){return r.student_id===sid&&r.kind===data.kind&&r.status==='pending'&&r.course_id===data.course_id&&r.date===data.date&&r.target_date===data.target_date&&r.attendance_id===data.attendance_id;});
 if(existing)throw Error('คำขอลักษณะเดียวกันอยู่ระหว่างตรวจสอบแล้ว');var id=id_();append_('PortalRequests',Object.assign({id:id,student_id:sid,amount_satang:0,slip_file_id:'',slip_name:'',status:'pending',admin_note:'',handled_at:'',approved_payment_id:'',created_at:now_(),updated_at:now_()},data));return {id:id,status:'pending'};
 }finally{l.releaseLock();}}
function submitPaymentSlip(token,info){var sid=requireSession_(token);if(!info||typeof info!=='object')throw Error('ไม่มีสลิป');
 var billId=String(info.billingId||''),bill=records_('Billing').filter(function(b){return b.id===billId&&b.student_id===sid&&b.status!=='cancelled';})[0];if(!bill)throw Error('ไม่พบค่าคาบที่ต้องชำระ');
 var paid=records_('Payments').filter(function(p){return p.billing_id===billId;}).reduce(function(v,p){return v+Number(p.amount_satang||0);},0);
 var open=Number(bill.amount_satang)-paid,amount=Math.round(Number(info.amountBaht)*100);
 if(!Number.isSafeInteger(amount)||amount<=0||amount>open||open<=0)throw Error('ยอดชำระไม่ถูกต้องหรือเกินยอดค้าง');
 var mime=String(info.mime||'');if(['image/png','image/jpeg','application/pdf'].indexOf(mime)<0)throw Error('รับเฉพาะ PNG, JPG หรือ PDF');
 var contents=String(info.base64||'');if(contents.length>6*1024*1024)throw Error('ไฟล์ใหญ่เกิน 4 MB');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(contents))throw Error('ไฟล์ไม่ถูกต้อง');
 var bytes=Utilities.base64Decode(contents);if(bytes.length<40||bytes.length>4*1024*1024)throw Error('ไฟล์ต้องมีขนาดไม่เกิน 4 MB');
 var isPdf=mime==='application/pdf'&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70;
 var isPng=mime==='image/png'&&bytes[0]===-119&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 var isJpg=mime==='image/jpeg'&&bytes[0]===-1&&bytes[1]===-40&&bytes[2]===-1;
 if(!isPdf&&!isPng&&!isJpg)throw Error('เนื้อหาไฟล์ไม่ตรงกับชนิดที่ระบุ');
 var lock=LockService.getScriptLock();lock.waitLock(20000);try{
 var hasPending=records_('PortalRequests').some(function(r){return r.student_id===sid&&r.kind==='payment'&&r.status==='pending'&&r.course_id===bill.course_id&&r.attendance_id===bill.attendance_id;});
 if(hasPending)throw Error('สลิปสำหรับคาบนี้กำลังรอตรวจสอบแล้ว');
 var folder=DriveApp.getFolderById(PORTAL_SLIP_FOLDER_ID);var ext=isPdf?'.pdf':isPng?'.png':'.jpg';var filename='AW_'+sid.slice(0,10)+'_'+Utilities.formatDate(new Date(),PORTAL_TZ,'yyyyMMdd_HHmmss')+'_'+id_().slice(0,8)+ext;
 var blob=Utilities.newBlob(bytes,mime,filename);var f=folder.createFile(blob);f.setDescription('AreWarin payment submission: pending manual bank verification. Never auto-approve.');
 var reqId=id_();append_('PortalRequests',{id:reqId,student_id:sid,kind:'payment',course_id:bill.course_id,schedule_id:'',attendance_id:bill.attendance_id,amount_satang:amount,slip_file_id:f.getId(),slip_name:filename,date:'',target_date:'',target_time:'',note:String(info.note||'').slice(0,500),status:'pending',admin_note:'',handled_at:'',approved_payment_id:'',created_at:now_(),updated_at:now_()});
 return {id:reqId,status:'pending'};
 }finally{lock.releaseLock();}}
