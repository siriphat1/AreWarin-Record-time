# Validation — v2.3.1

## Executed tests

- `node --check assets/app.js` — syntax valid
- All 8 `tests/*.test.cjs` — PASS
- `python tests/v231-navigation-browser.test.py` — PASS 1366x900 and 390x844
  - default sidebar displays 5 categories + dashboard
  - accordion category opens and closes; only one category expanded
  - submenu navigation works; section tabs switch among related pages
  - selected category and page highlighted
  - collapsed desktop sidebar fits 76px with no vertical menu overflow
  - clicking a category in collapsed mode expands sidebar automatically
  - mobile menu and bottom navigation remain available
- `python tests/v23-browser.test.py` — PASS leave/pause, make-up, ledger, two-stage payments, calendar, ICS, backup, journal, mobile
- `python tests/v18-browser.test.py` — PASS historical recording, duplicate checking, import, refunds and pending workflow, adapted for the v2.2+ separation of Learning History from Student Profile
- `python tests/v20-ui-browser.test.py` — PASS 1440px / 390px navigation, search, import, theme switch
- `python tests/v201-dates-attendance-browser.test.py` — PASS multi-day history and file-date handling
- `python tests/v202-no-duplicate-date-browser.test.py` — PASS hide redundant date edits

## Not covered

- No live tests against the actual Google Sheets account
- OAuth token lifetime / real multi-editor concurrency
- User-specific external Apps Script backup automation

Use a backed-up Google Sheet and test one non-sensitive student/session before production deployment. No database migration is necessary when upgrading from v2.3.

## v2.3.2 — Import Date Editor (2026-10-30)

- `node --check assets/app.js`: PASS.
- `tests/*.test.cjs`: PASS (8 existing suites).
- `python tests/test_import_date_editor.py`: PASS with Chromium, local HTML/CSS/JS injection because network navigation is restricted in this test environment.
  - Displays **แก้วันที่** on all unsaved import drafts even if date was extracted automatically.
  - Opens input for one specific file; cancellation leaves draft unchanged.
  - Typing a date without clicking Save does not mutate the draft; Final Review is blocked until the date editor is saved or cancelled.
  - Saving updates only the chosen file's date and source note; changing first file does not change other files.
  - `constructImportBatch()` uses updated date for Session, Imports and Audit information.
  - Date conflicts can be confirmed; saved files cannot be edited from the pre-import table.
  - Date editor renders on 390px mobile viewport.
- Limitations: no live Google Sheets connection tested. Test against a backup before importing real student attendance.
