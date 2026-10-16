---
'@molecule/api-ai-tools': patch
---

A backgrounded test-suite run (Playwright, Vitest or Hurl) now starts at lower CPU and IO priority, so the commands an executor sends while it runs stay responsive instead of queueing behind the suite's own workers.
