# Security & data handling

- Student Web App has NO direct Google Sheets/Drive API credentials. All student-sensitive functions revalidate the server-side session token and filter by its student ID. No client-supplied `studentId` controls data access.
- PIN is exactly four digits as requested, protected by invitation-only activation, per-account lockout, salted repeated SHA-256 + a secret server-side pepper, and token expiration. For a larger production portal, strongly prefer a managed identity provider and stronger authentication. Do not expose the Google Spreadsheet or PIN hashes publicly.
- Tutor OS Admin has powerful Sheets access via Google OAuth. **Do not share admin login credentials** or embed Google tokens in the student HTML.
- Publicly deployed Apps Script `google.script.run` can call top-level functions without `_` suffix. Ensure **ALL** privileged configuration/backup/maintenance functions are private and any callable student API function checks authentication. The included Setup.gs renames maintenance helpers with trailing `_`.
- QR means payment INSTRUCTIONS only; no confirmation of bank transfer. All slips need human verification. The Apps Script code refuses to mark Billing paid automatically from a slip.
- The bank recipient name presented in the QR scanning app is controlled by recipient bank records, not by the display text in Student Portal. Check account name in the banking app before real use.
- Uploaded slips are private Google Drive files, maximum 4 MB, limited to PNG/JPEG/PDF via MIME and file signature checks. A determined attacker could still upload malicious polyglot files. Do not serve them publicly; use a suitable scanning/review workflow for production.
- PortalRequests include `slip_file_id` references; access to files should be restricted to staff only. Student API returns only request status and amount, no other student's file IDs.
- `Attendance` / `Ledger` / `Audit` remain authoritative under Tutor OS. Student displays final approved and computed balances, NEVER change history or duplicate deductions from submitted requests.
- Consider legal responsibilities under Thailand's PDPA: provide a privacy notice, limit access, retain receipts only as needed, and have a deletion policy and incident response.
- Race conditions: Google Sheets is not ACID. Parallel admin approvals can race despite fresh-read checks; do not run multi-admin finance approval at scale without moving to transaction-safe storage and server-side idempotency.
