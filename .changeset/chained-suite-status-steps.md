---
'@molecule/api-ai-tools': patch
---

A background Playwright run wrapped in a status-capture chain (`…; rc=$?; echo …; exit $((…))`) now keeps the platform's progressive `list` reporter, the inline-failure switch and the machine JSON report, instead of running on the reporter the command happened to name.
