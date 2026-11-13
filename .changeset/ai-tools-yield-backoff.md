---
'@molecule/api-ai-tools': patch
---

Background Playwright feedback waits longer after each consecutive run that yields to the sandbox's own foreground work (doubling from `yieldRetryMs`, default 1 s, up to 16 s); a finished run resets it and a source write still retries at once.
