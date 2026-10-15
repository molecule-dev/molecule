---
'@molecule/api-ai-tools': patch
---

A background Playwright run drops a trailing `| head -N`, which would cut its pass/fail count.
