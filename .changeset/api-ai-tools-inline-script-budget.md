---
'@molecule/api-ai-tools': patch
---

`exec_command` keeps the full command budget when an inline interpreter program is chained with a statement that runs a script file or a program the local-transform allowlist does not cover, instead of applying the short local-transform budget to the whole command.
