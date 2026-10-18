---
'@molecule/api-ai-tools': patch
---

Refuse a foreground `exec_command` that starts a server — including one named only inside a script it runs — with the background launch (or a probe of the running API) to use instead, and give an over-budget server run that advice rather than "run a smaller unit".
