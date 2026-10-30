# v2.3 Test Results & Verification

### Automated checks executed on 30 October 2026

| Test | Result |
|---|---|
| `node --check assets/app.js` | PASS |
| `node --check Setup.gs` (checked as `.js`) | PASS |
| `tests/connection-and-batch.test.cjs` | PASS |
| `tests/hourly-billing.test.cjs` | PASS |
| `tests/schedule-view.test.cjs` | PASS |
| `tests/smoke.test.cjs` | PASS |
| `tests/v16-bulk-summary.test.cjs` | PASS |
| `tests/v17-import-dates.test.cjs` | PASS |
| `tests/v171-confirmation-dates.test.cjs` | PASS |
| `tests/v23-operations.test.cjs` | PASS |
| `tests/v23-browser.test.py` | PASS |
| Student calendar/parent report browser seed | PASS |
| Full live Sheets/OAuth/PDF CDN integration | NOT VERIFIED |

### Tested workflows

1. Adding a pause with return estimate does not touch package `Ledger`.
2. Adding and scheduling a make-up credit does not charge; recording through Record Make-up charges once and closes the credit.
3. Individual group exception only hides class for that student; global recurring exception moves a single occurrence, including to a later week.
4. Part payment followed by remainder closes the same bills while preserving each payment event.
5. Cancelling a partially paid attendance leaves an outstanding refund obligation for the amount actually paid.
6. Student calendar displays recorded, leave, and makeup indicators, and supports an interactive side drawer.
7. Calendar `.ics` and private JSON files download; lesson journal writes entry; mobile main views have no horizontal body overflow at 390 px.
8. Previous Google Meet import and legacy course-billing tests remain green.

### Must validate on real data before deployment

- Apps Script permissions and incremental schema migration for the private spreadsheet.
- Two admin accounts editing the same spreadsheet: Google Sheets API does not provide app-level concurrent locking.
- Date and student matching of real imported Excel reports.
- Actual browser PDF generation using CDN-loaded `html2canvas` and `jsPDF` (no external internet in the automated browser test environment).
- Drive scheduled backups and restoration to a copy.
