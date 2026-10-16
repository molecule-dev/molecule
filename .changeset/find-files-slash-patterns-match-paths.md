---
'@molecule/api-ai-tools': patch
---

`find_files` matches a pattern containing `/` against each file's path, so `helpers/*`, `src/**/App.tsx` and `e2e/*.spec.ts` return the files they name instead of an empty list.
