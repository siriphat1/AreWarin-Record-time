# Changelog — v2.3.0

**New sheets**: `LeaveRecords`, `ScheduleExceptions`, `MakeupCredits`, `LessonNotes`, `Payments`.

**UI**: Dashboard follow-up banner, Leave & Make-up operations, Teaching Journal, Notification Center, System Health & Backup, payment receipts, calendar color legend, side drawer, one-time schedule exceptions, direct parent PDF export and `.ics` calendar export.

**Data logic**: time/ledger untouched for leave and scheduling; manually recording a scheduled make-up updates the corresponding credit in the same Sheets batch; partial hourly receipts allocated oldest-first with a `Payments` history; refund-due when cancelling a paid/part-paid class; old paid bills without Payment rows remain recognised for compatibility.

**Safety**: preserve original Sheets, run `setupTutorOS()` to add new sheets; live restore is via inspected Drive spreadsheet copies (not automatic destructive browser restore); reminders do not run in background; warn on segmented Meet attendance and differing actual vs billed minutes.

**Known limitations**: direct PDF requires external JS libraries; no live Google Sheets integration test in this environment; no server-side locking for concurrent editors; Meet import does not auto-close a make-up credit; course-specific leave does not automatically identify course IDs in pre-v2.3 schedule rows.
