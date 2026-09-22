---
'@molecule/api-ai-tools': minor
---

`write_file` and `edit_file` parse the file they just changed (`node --check`, `JSON.parse`, or esbuild for TypeScript) and return the syntax error in the same result as `syntaxError`, so an edit that breaks a file is reported while the edit is still in front of the agent instead of at the next build.
