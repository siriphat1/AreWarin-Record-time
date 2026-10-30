# Upgrade from v2.2 — Do these steps in order

1. Make a copy of the private Google Spreadsheet.
2. Replace **Apps Script** code with the included `apps-script/Setup.gs`; run **`setupTutorOS()`** once. Verify new sheets `LeaveRecords`, `ScheduleExceptions`, `MakeupCredits`, `LessonNotes`, `Payments` exist.
3. Replace only the public site's `index.html`, `assets/app.js`, `assets/style.css` from the update-only ZIP.
4. Preserve your existing **`config.js`** with your real OAuth settings and Spreadsheet ID. Don't add the Spreadsheet data or JSON backups to GitHub.
5. Reload with Ctrl + Shift + R; sign in again if requested.
6. Test leave, scheduling, make-up record, part payment, parent report, and the new System Health screen using test data; verify the actual rows in Google Sheets.

Optional automatic backups: run `installDailyBackup()` separately in Apps Script and verify the trigger and copied file. Read `README.md` for limitations on live restores and concurrent writes.
