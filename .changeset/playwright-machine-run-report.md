---
'@molecule/api-ai-tools': minor
---

Playwright runs can keep Playwright's own JSON report: `exec_command` and `wait_for_task` results carry a bounded `runReport` with each failing test's identity and the artifacts saved for it, and trace reads include the directory a trace came from, so a diagnosis can attribute evidence by the runner's record instead of the printed log.
