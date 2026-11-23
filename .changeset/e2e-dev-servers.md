---
'@molecule/app-e2e': minor
---

`e2eRunnerDefaults()` adds Playwright `webServer` entries from the new `e2eDevServers()`: the app's dev server and the API beside it start when nothing answers yet, and a running one is reused.
