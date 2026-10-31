# Portal v1.0.1 / Tutor OS v2.5.1 UI patch

The Tutor OS **Create/Edit Group** member picker is now responsive and searchable, with correctly sized checkboxes. Student Portal authentication, payment, hours, and existing group membership logic are unchanged. See `CHANGELOG-group-form-v1.0.1.md`.

# AreWarin Student Portal v1.0 + Tutor OS v2.5.0 integration

A private-by-default student view, **hosted inside Google Apps Script HTML Service**, with a compact Student ID, invitation + PIN setup, schedules, approved learning hours, courses, hourly fees, PromptPay QR, payment slip submissions to a restricted Google Drive folder, course/leave/makeup requests, and an administrator approval inbox integrated into Tutor OS.

**Not live yet.** This is installable source code. Deployment, Google permissions, real bank QR verification, and real Sheets/Drive acceptance tests must be completed by the owner.

## Package layout

- `tutor-os/` — modified Tutor OS v2.4.3, labeled v2.5.0 integration, with `assets/portal-manager.js`, `Portal Manager` submenu, account generation on new student creation, and four extra Sheets in `Setup.gs`.
- `student-portal/apps-script/StudentPortal.gs` — secure web-app back end.
- `student-portal/apps-script/Student.html` — responsive student interface (Google Apps Script HTML Service, **not** standalone GitHub Pages).
- `tests/portal-server.test.cjs` — server logic tests with mocked Google APIs.
- `tests/student-client.js` — extracted JavaScript syntax check.
- `docs/INSTALLATION.md` — exact installation steps.
- `docs/SECURITY.md` — security limits and prelaunch checklist.

## Important functionality

- **Student ID:** e.g. `26-1234`; generated when adding a NEW student in the updated Tutor OS. Existing students can receive IDs from Portal Manager. The ID itself is not a password.
- **First-time activation:** unique, high-entropy invitation link shown to the admin once. PIN is set on the Apps Script server, never stored as plaintext. Five failed PIN attempts lock the account for 30 minutes. Tokens last 24 hours.
- **Student view only:** filters all private data on the server using authenticated student_id. Includes *approved* Attendance, final deducted duration, course purchases/usage/balance, schedule, hourly billing, requests, makeups and selected LessonNotes. **No Audit, editor identity, original Meet files, or editing events are included.**
- **Request + approval:** leave, pause, makeup preferences, renew, new course, attendance review, optional class confirmation and payment submission go through a request queue. Approval happens in the existing Tutor OS Portal Manager, protected by the admin's existing Google Sheets OAuth.
- **Payments:** displays individual unpaid hourly bills and amount-aware Thai PromptPay EMV QR (PromptPay national ID `1901001151577`; bank account alternative `664-343-6974`, Krungthai). Slip upload goes into the specified private Google Drive folder. Upload alone **never marks a bill as paid**. Admin must verify actual bank receipt before approval. QR rendering requires the external `qrcodejs` CDN; fallback displays account data if unavailable.
- **Admin request approval:** approving a payment creates exactly one `Payments` row and updates Billing to paid only after fully settled; approving leave/pause creates a corresponding `LeaveRecords` entry; course/makeup/attendance-review approvals denote admin acceptance of request only and **require the relevant existing Tutor OS action** (renew course, schedule makeup, adjust attendance) separately.

## Known limits

- No parent-specific login; initial release is students only. Parent roles need separately scoped authorization.
- No independent bank transfer verification; all payments need human approval after comparing real incoming transactions.
- No SMS/email alerts or automatic course creation on request approval.
- No automatic Google Calendar two-way synchronization.
- Apps Script/Sheets is not a strong transactional database for concurrent admins; if throughput grows, move auth and approvals to a transactional database/backend with proper idempotency.
- PIN length 4 offers limited security; treat account activation, rate limiting and limited access scope seriously. Portal session token lives in `sessionStorage` and expires in 24 hours.

See `docs/INSTALLATION.md` before use. Do **not** copy personal student records into the public GitHub repository.
