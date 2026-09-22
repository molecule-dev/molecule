---
'@molecule/api-ai-tools': patch
---

`wait_for_task` reports a background command as stuck — with its pid, so it can be killed — once five minutes of waiting have accrued on it without an exit, and refuses to wait on it again.
