# AreWarin Tutor OS v2.3.0

**Operations & Teaching Management · Botanical Minimal Pro**  
GitHub Pages + private Google Sheets + Google OAuth. Interface: Thai/English.

## New in v2.3 (consolidated upgrade)

1. **Leave & Learning Pause**: record leave, a pause period, optional course scope, expected return; explicit confirmation on returning; historical audit. A leave/pause record alone never changes purchased balances or billing.
2. **Make-up Class Credits**: trace original date and learner, plan a new date/time, check for conflicting schedules, then record class in **Record Hours**. The credit is marked completed in the same logical save as the attendance, billing/ledger. Cancelling that attendance reopens the scheduled make-up. Does not deduct while merely scheduling. To protect against accidental double deductions, importing a Meet file does **not** automatically link an existing make-up; use the dedicated Record Make-up action to close its credit.
3. **One-day Schedule Exceptions**: cancel or reschedule a single occurrence without deleting the weekly recurrence; for groups choose one student or everyone. Calendar remains the source of scheduled (not necessarily attended) lessons.
4. **Teaching Journal**: subject taught, homework, next-class follow-up, linked by Attendance ID and stored in `LessonNotes`.
5. **Payment Center**: combine hourly bills, record part payments and full payments, allocate across oldest bills first, retain `Payments` history and partial status. Cancelling a paid/part-paid attendance marks refund due, not refunded. Actual refunds require explicit confirmation.
6. **Smart Google Meet Attendance Review**: warnings for reconnects / multiple joined intervals and mismatches between actual and deductible time. Uses the existing segment merging, checks overlaps and confirmation flow.
7. **Parent Report Pro**: filter learner, month, course/cycle; CSV and direct PDF download. Direct PDF uses the online CDN dependencies `html2canvas` and `jsPDF` to preserve Thai characters as rendered graphics; if unavailable, the print-to-PDF fallback is offered. These reports include only approved, noncancelled Attendance, not future scheduled classes.
8. **Reminders Center**: in-app flags for planned classes not yet recorded today, make-ups to plan, expected return dates, low package hours, overdue hourly bills. Shown when the web app is opened/refreshed. **Not a push notification / background monitoring service.**
9. **System Health & Backup**: checks balances, imports, billing, make-ups, ledger mismatches, audit; exports **private** JSON. Demo-only JSON restore. The Apps Script includes optional daily spreadsheet-copy backup and restoring the live system means validating and switching to an existing Google Drive backup copy, **not** destructively overwriting a live sheet via the browser.
10. **Calendar Export & Interface**: 90-day `.ics` export; personal calendar with private, group, makeup, leave colors, plus side drawer for class details.

All v2.2 functionality — class groups, packages, hourly courses and course cycles, time recording, multi-Excel imports, student calendar, parent reporting, aliases — is retained.

## Deployment from v2.2 — REQUIRED database migration

1. **Back up your actual Google Spreadsheet**, using Google Sheets → File → Make a copy, before changing it. Check the copy.
2. In your original *private* Spreadsheet, open **Extensions → Apps Script**. Replace the bound `Setup.gs` with `apps-script/Setup.gs` in this release, then run `setupTutorOS()` and grant the requested permissions. This function checks headers before touching existing data and creates five additional sheets:

   | New sheet | Purpose |
   |---|---|
   | `LeaveRecords` | Leave/pause periods, return dates |
   | `ScheduleExceptions` | One-day exceptions (single learner or group) |
   | `MakeupCredits` | Original and replacement make-up events |
   | `LessonNotes` | Lesson journal entries |
   | `Payments` | Individual cash receipts for hourly lessons |

3. Check the five new sheets exist and their header rows match `Setup.gs`. **Do not** manually delete or reorder old sheets and columns.
4. Publish the new `index.html`, `assets/app.js`, and `assets/style.css` to your GitHub Pages repository. **Preserve your own `config.js` from v2.2** (Google Client ID / Spreadsheet ID); don't replace it with the empty template in the full archive.
5. Refresh the deployed site with **Ctrl + Shift + R** and authenticate with Google if prompted.
6. Do a controlled trial using a test learner and test course: create leave, a make-up credit, schedule it, record it, inspect **Ledger**, **Billing**, **Payments**, **Audit**, and compare the Sheets row entries and totals before using real learner data.

### Optional Google Drive daily backup

Run `installDailyBackup()` in the same Apps Script project after approving the Google Drive scopes. It creates a time-based trigger for `backupTutorOS()` that makes a copy of the spreadsheet. **This trigger is not installed automatically**. Verify in Apps Script → Triggers and check the backup copies; review Drive storage and your backup retention practice.

### Recovering from a backup

**Live Google Sheets**: inspect a dated spreadsheet copy in Drive, verify contents, then intentionally switch to the chosen backup's Spreadsheet ID by updating your existing `config.js` (and authorized sharing). Do not overwrite the original until you have verified the backup.  
**Demo only**: System Health & Backup → Select backup JSON. This replaces *local demo data only*; it cannot write to live Google Sheets.

## Operational guardrails

- *Planned != Attended*: scheduling, leaving, rescheduling, or creating a make-up credit do **not** count as attendance or deduct package minutes.
- *Package != Hourly*: package attendance records a negative `Ledger` debit; hourly attendance creates a `Billing` invoice; recording a partial payment is a separate `Payments` entry. A paid invoice is not automatically a refund.
- *Single vs group*: leave for one group member does not cancel the group for everyone. For **course-scoped leave**, existing `Schedules` lack a `course_id` field, so only all-course leave automatically hides private schedule items; adjust the affected occurrence manually when using course-specific leave.
- *Migrations*: Google Sheets stores remain tied to their existing primary IDs; do not change header order.
- *Concurrency limitation*: direct Google Sheets API batch updates are not the equivalent of an isolated, server-locked database transaction. Avoid multiple administrators writing simultaneously; validate your totals and backups. For heavy multi-user usage consider a server-side transaction service.
- *Sensitive information*: never publish real student data, downloaded JSON backups, or your actual `config.js` with private account details in a public repository. This app ships with **no actual student names**.
- *PDF dependencies*: `html2canvas` / `jsPDF` need internet access to load from jsDelivr. If blocked, the print/PDF alternative remains available. A PDF download is generated in-browser, not emailed to parents.
- *Notifications*: in-app dashboard and reminders only; no external SMS/LINE/email dispatch or notifications while the webpage is closed.

## Tests

Use `node --check assets/app.js`, run all `node tests/*.test.cjs`, and (with Playwright and Chromium) `python tests/v23-browser.test.py`. The tests cover leave/pause, recurring exceptions and individual group exceptions, make-up credits, double-charge prevention for manually linked credits, ledger & partial-billing refunds, CSV, and mobile layout. Browser and VM tests use mock/demo data; live OAuth & actual Google Sheets edits require your private account.

**For an incremental update, use `AreWarin-Tutor-OS-v2.3-update-only.zip`.** It intentionally omits `config.js` to protect your working configuration.
