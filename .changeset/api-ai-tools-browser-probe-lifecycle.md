---
'@molecule/api-ai-tools': patch
---

`exec_command` now refuses a directly executed standalone script that launches a browser and never closes it, instead of waiting the full budget and then advising the background; the timeout advice names a `try/finally` close or the Playwright runner's browser fixture. Ambiguous scripts (aliases, cleanup helpers, context/page disposal, `using` scopes, explicit exit, persistent browser/server intent, test runners and fixtures) are left alone.
