---
'@molecule/api-ai-tools': patch
---

A command that starts the suite more than once is refused in the foreground as well as in the background, and a suite's own runner script (`run-api-tests-hurl.sh`, `run-hurl-tests.sh`) counts as a suite run.
