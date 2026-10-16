---
'@molecule/api-ai-tools': patch
---

A backgrounded Playwright run is started with `--reporter=list` — and an explicit `--reporter=line` is switched to it — so each test result is written to the log as it finishes, in the shape the platform reads back.
