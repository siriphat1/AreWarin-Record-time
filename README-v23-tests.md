# Run test suite

```
node --check assets/app.js
for f in tests/*.test.cjs; do node "$f"; done
python tests/v23-browser.test.py
```

Tests with Playwright need a Chromium binary at `/usr/bin/chromium` and Python `playwright`; browser tests generate screenshots in this package. They use demo/mock data. Test the connected Google Sheets separately on an authorized private copy before production rollout.
