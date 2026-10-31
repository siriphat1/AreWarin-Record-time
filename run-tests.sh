#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
for f in "$ROOT"/tutor-os/tests/*.test.cjs; do node "$f"; done
node "$ROOT/tests/portal-server.test.cjs"
node "$ROOT/tests/admin-integration.test.cjs"
node "$ROOT/tests/promptpay.test.cjs"
node --check "$ROOT/tutor-os/assets/app.js"
node --check "$ROOT/tutor-os/assets/portal-manager.js"
node --check "$ROOT/tests/student-client.js"
node --check < "$ROOT/student-portal/apps-script/StudentPortal.gs"
echo "All non-browser tests passed."
