---
'@molecule/api-ai-tools': patch
---

`wait_for_task`'s note for a command that is still running states each fact once: the elapsed time and the "its output is still growing" clause were each printed twice, once in the note's own lead and once in the progress sentence appended to it.
