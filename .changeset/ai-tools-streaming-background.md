---
'@molecule/api-ai-tools': patch
---

A background command's log now fills while it runs: a trailing `| tail -N` is dropped and a Playwright run without a reporter streams with `--reporter=line`.
