/**
 * AreWarin Tutor OS - Google Sheets database setup & backup.
 * Attach this script to a PRIVATE Google Spreadsheet via Extensions > Apps Script.
 * Run setupTutorOS() on installation and after the v2.3 upgrade; it preserves matching older sheets and adds new ones.
 * GitHub Pages app connects directly with OAuth + Google Sheets API.
 * No API secrets or passwords in public JavaScript.
 */
const TUTOR_SCHEMA = {
  Students: ['id','name','email','aliases','status','created_at','notes','full_name','school','grade_level','academic_year','updated_at','hourly_rate_baht'],
  Courses: ['id','student_id','title','cycle_no','start_date','purchased_minutes','status','previous_course_id','created_at','closed_at','billing_mode','hourly_rate_baht'],
  Groups: ['id','name','member_ids','created_at'],
  Schedules: ['id','date','student_id','group_id','start_time','end_time','tutor','repeat_rule','status','notes','created_at'],
  Sessions: ['id','date','start_time','end_time','mode','group_id','tutor','time_source','status','source_file','notes','created_at'],
  Attendance: ['id','session_id','student_id','course_id','join_time','leave_time','actual_minutes','deduct_minutes','status','source_name','created_at'],
  Ledger: ['id','student_id','course_id','session_id','type','minutes','note','created_at'],
  Imports: ['id','fingerprint','filename','date','session_id','created_at'],
  Audit: ['id','action','target_id','details','created_at'],
  MeetAliases: ['id','student_id','meet_name','email','normalized_name','normalized_email','status','verified_at','created_at'],
  GroupMemberships: ['id','group_id','student_id','joined_at','left_at','status','created_at'],
  ClassRules: ['id','scope_type','scope_id','basis','rounding_minutes','minimum_minutes','updated_at'],
  CoursePolicies: ['id','course_id','expires_on','rollover_policy','updated_at'],
  StudentEducationHistory: ['id','student_id','old_school','old_grade_level','old_academic_year','new_school','new_grade_level','new_academic_year','changed_at'],
  Billing: ['id','attendance_id','student_id','course_id','session_id','minutes','rate_baht','amount_satang','status','paid_at','payment_method','note','created_at','updated_at'],
  LeaveRecords: ['id','student_id','course_id','kind','start_date','end_date','expected_return','reason','status','created_at','updated_at'],
  ScheduleExceptions: ['id','schedule_id','occurrence_date','student_id','kind','replacement_date','start_time','end_time','reason','created_at','updated_at'],
  MakeupCredits: ['id','student_id','course_id','origin_schedule_id','origin_date','planned_minutes','scheduled_date','start_time','end_time','tutor','status','linked_attendance_id','notes','created_at','updated_at'],
  LessonNotes: ['id','attendance_id','student_id','course_id','title','homework','follow_up','created_at','updated_at'],
  Payments: ['id','billing_id','amount_satang','method','paid_on','note','created_at']
};
function setupTutorOS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw Error('Open this script from the target Google Spreadsheet.');
  Object.keys(TUTOR_SCHEMA).forEach(name => {
    const headers = TUTOR_SCHEMA[name];
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const existing = sheet.getLastRow() ? sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),headers.length)).getValues()[0] : [];
    if (existing.some(v=>v !== '')) {
      // Only add new columns at the end; never move or overwrite existing student data.
      const nonempty=existing.filter(v=>v!==''&&v!==null);
      if (nonempty.some((v,i)=>headers[i]!==v)) throw Error(`Sheet ${name} has different headers. Please check without overwriting data.`);
      if (nonempty.length<headers.length) {
        const extra=headers.slice(nonempty.length);
        sheet.getRange(1,nonempty.length+1,1,extra.length).setValues([extra]);
        sheet.getRange(1,nonempty.length+1,1,extra.length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#174b3a');
        sheet.setColumnWidths(nonempty.length+1,extra.length,150);
      }
    } else {
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#174b3a');
      sheet.getRange(1,1,1,headers.length).setWrap(true);
      sheet.setColumnWidths(1,headers.length,150);
      sheet.setColumnWidth(1,225);
      sheet.setTabColor('#246a51');
    }
  });
  ss.toast('AreWarin Tutor OS database is ready. Keep this file private.');
  Logger.log('Spreadsheet ID: '+ss.getId());
}
function backupTutorOS() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd_HH-mm');
  const copy=DriveApp.getFileById(ss.getId()).makeCopy('AreWarinTutorOS_backup_'+stamp);
  Logger.log('Backup created: '+copy.getUrl());
  return copy.getUrl();
}
function installDailyBackup() {
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='backupTutorOS').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backupTutorOS').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Daily backup enabled. Monitor Google Drive storage and backup retention.');
}
