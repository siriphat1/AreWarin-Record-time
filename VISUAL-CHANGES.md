# AreWarin Tutor OS v1.9 — Visual Design Updates

This release changes only the interface presentation (and navigation labels / displayed date), not the enrollment, Google Sheets, Meet import, hour deduction or cancellation rules.

## Design changes
- Dark forest-green sidebar with modern outlined SVG icons and Thai navigation labels
- Topbar with current Bangkok date and clearer breadcrumb, refresh and connection indicators
- Dashboard with stronger hierarchy, highlighted remaining-hours card, airy surfaces and typography
- Harmonized student cards, tables, forms, schedules, import steps, and final confirmation
- Improved responsive layout for mobile with cleaner readable text and touch targets
- Keyboard focus-visible rings and reduced-motion accessibility

## Deployment
1. Back up your existing site and Google Sheets.
2. Replace `index.html`, `assets/style.css` and `assets/app.js` with v1.9 files.
3. Keep the existing OAuth and Spreadsheet IDs in `config.js`.
4. Do not edit Google Sheets or run Setup.gs: no data schema changed.
5. Hard refresh the website if previous styles remain in browser cache.

## Validation
- Visual tests run in browser at desktop and mobile widths on demo data.
- JS logic tests inherited from v1.8; still verify on your live Google Sheets before production deployment.
