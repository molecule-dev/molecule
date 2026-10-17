---
'@molecule/api-ai-tools': patch
---

A background Playwright run prints each failure's own error into its log as that test fails, not only in the summary at the end: `streamingBackgroundCommand` sets Playwright's inline-failure switch on the `list` reporter it puts a background suite on. A run that is still walking therefore carries its causes, so `grep -n -A 20 '<test name>' <log>` returns a failure's error while the suite is running instead of the `✘` row alone.
