---
'@molecule/api-ai-tools': patch
---

A suite run piped through a chain of output filters (`grep … | head …`) is recognised as filtered, so the unfiltered command is handed back together with the pipe that cut the failure detail.
