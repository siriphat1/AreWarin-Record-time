# AreWarin Tutor OS v2.3.1 — Sidebar Navigation UX

**Release type:** UI-only, backward-compatible with v2.3 Google Sheets schema.

## Improved
- Consolidated 13 functional links into **5 expandable categories**, plus a permanent Dashboard shortcut.
- One category expands at a time; only its related submenu links are visible.
- Active page highlighted both in the submenu and parent category.
- Added quick-access **section tabs** inside the work area for related pages.
- In collapsed desktop mode show only six icons; clicking a category expands the sidebar and its submenu.
- Works on mobile sidebar with the existing five-item bottom navigation.
- Preserved existing navigation actions and deep links from Profile, Calendar, Dashboard, Notifications and Reports.
- Existing theme toggle and Global Search unchanged.
- Accessible button semantics with `aria-expanded`, `aria-controls`, `aria-current` and descriptive tooltips.

## Not changed
- `SCHEMA` and `apps-script/Setup.gs` 
- Session, Attendance, Ledger, Billing, Payments or other stored data
- Approval, import, make-up and repayment business logic

## Files updated
- `index.html`
- `assets/app.js`
- `assets/style.css`

## Test coverage
- 8 existing Node.js suites passed.
- Chromium v2.3 end-to-end operations passed.
- Chromium v2.0 UI desktop + mobile passed.
- New Chromium v2.3.1 sidebar + section-tabs test passed on desktop and mobile.
- Historical v1.8 browser smoke updated to use grouped sidebar and the v2.2+ calendar/history separation; passed.
