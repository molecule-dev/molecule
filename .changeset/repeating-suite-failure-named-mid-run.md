---
'@molecule/api-ai-tools': patch
---

A running background suite whose failures keep repeating one cause is now named while it runs: `wait_for_task` reads the live log, and at the third failure sharing a signature — the same error message, or the same duration to within half a second — it returns early with that cause, the tests it hit and the pid command that stops the run, instead of handing back the finished log minutes later. An iterating Playwright run also reports `list,line`, so each failure's own error reaches the log as the failure happens.
