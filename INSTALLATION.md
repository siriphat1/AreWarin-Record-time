# Installation — AreWarin Student Portal v1.0

**Work on a COPY of your Google Sheets first** and use fake students and billing rows to test. Keep the original Tutor OS and private Google Drive folder unchanged until acceptance tests pass.

## A — Database and secure Apps Script

1. Open the **same private Google Spreadsheet** used by Tutor OS (owner account) -> Extensions -> Apps Script.
2. Replace the existing `Setup.gs` with the safe version at `tutor-os/apps-script/Setup.gs`, which marks setup/backup functions private (`_` suffix) so they aren't remotely callable by anonymous student Web App visitors. If you have your own modifications, merge them manually and verify *every* privileged server function is private / authenticated.
3. Add `student-portal/apps-script/StudentPortal.gs` as a script file named **`StudentPortal.gs`**.
4. Add `student-portal/apps-script/Student.html` as an HTML file named **`Student.html`**.
5. From the Apps Script **editor** run `setupTutorOS_` (one time) to add PortalAccounts/PortalSessions/PortalRequests/PortalNotifications; run `setupStudentPortal_` to set up a random private server pepper and verify the portal headers. Both are restricted editor-side helper functions and should not be called from the public web page. Authorize Sheets/Drive scopes when prompted.
6. Confirm the spreadsheet has the 4 newly added Portal* sheets alongside all Tutor OS sheets. The four new sheets must remain **private**.
7. Confirm the script owner has **Editor** access to the destination private Drive folder, ID `1-m5qRJXsTm4Zzh92hsSqi5gHQV-2nhEV`. Do NOT make the folder publicly writable or share its files with the whole internet.
8. In Apps Script click Deploy -> New deployment -> **Web app**: execute as **Me** (owner) and allow access to intended users. Since students do not need Google accounts, 'Anyone' may be required for this deployment; that is precisely why the server validates sessions for every private request. Do not expose unrelated privileged functions. Copy the Web App `/exec` URL.
9. Open the Student Portal URL. Before adding students, only a PIN login/activation form should appear. Never test with real student records until authorization, request checks and Drive uploads have been verified on the copied database.

> When you change Apps Script source after deployment, create a NEW DEPLOYMENT VERSION or edit the deployment to point at a new version. Saving script changes alone does not update the existing `/exec` web app.

## B — Deploy Tutor OS administrator UI

1. Extract `tutor-os/` to your GitHub Pages site (not the public Apps Script project). Upload `index.html`, `assets/app.js`, `assets/style.css`, and **new `assets/portal-manager.js`**.
2. **Preserve your existing `config.js` Google OAuth Client ID and Spreadsheet ID.** Add only a new optional property:

```js
studentPortalUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
```

3. Reconnect Google OAuth to Sheets in Tutor OS. The admin's authenticated Google Sheets session grants access to its Portal Manager; the student page never uses those OAuth credentials.
4. In Tutor OS -> **นักเรียนและคอร์ส -> Student Portal Manager**, create invitations for existing students; new students receive IDs and invitations at creation. COPY the invitation immediately, because the activation secret is not recoverable afterward.
5. Send the invite privately to the intended student or authorized parent. After opening it the user sets and confirms a numeric 4-digit PIN. If lost, reset PIN via the private admin Portal Manager; it revokes all previous sessions.

## C — Manual acceptance checklist

- Create sample Student A and B and separate courses. Log into A and confirm B's name, schedule, billing and requests NEVER appear, even if manually changing request identifiers in browser developer tools.
- Check that displayed session info includes **only final approved** date/time and deducted hours; no 'time was edited', editor name, original Meet join times or adjustment reasons.
- Test package course purchase/used/balance, hourly course amount and a partial-payment example.
- Verify Thai QR contains the intended PromptPay ID and **exact selected amount** by scanning using your real bank's scanner without making a transfer. If QR rendering fails, the client displays bank account details instead.
- Upload a PNG/JPEG/PDF test slip <=4 MB. Confirm it is created in the specified Drive folder and that the payment stays **pending** in Student Portal and Billing.
- In the **admin account**, independently check actual bank incoming transaction, open the private slip in Google Drive, then approve. Confirm it creates a Payments row; partial payment leaves the remainder outstanding. Reject a test request and verify status shown to student.
- Create leave, pause, makeup and renewal requests; confirm admin approvals do not silently add hours or create new paid courses. Complete approved requested operations through Tutor OS.
- Try five bad PIN attempts and verify 30-minute lockout. Try another student code and ensure credentials do not work. Test signing out and resetting PIN.
- Confirm untrusted changes to `courseId`, `attendanceId` and `billingId` cannot access another student's records.

## D — Updates and rollback

Back up the Tutor OS spreadsheet before any change. Add all four schema sheets before deploying modified Tutor OS, otherwise its Google Sheets load will fail. Rollback means restoring previous GitHub Pages frontend files and Apps Script deployment version; the new Portal* sheets can remain private without harming older Tutor OS versions. **Never delete or overwrite existing Students, Courses, Ledger or Payments.**
