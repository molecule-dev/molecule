---
'@molecule/api-ai-tools': patch
---

`parseCheckProblem` returns `null`, not an empty string, for a parse check that failed without printing anything.
