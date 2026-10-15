---
'@molecule/api-ai-tools': patch
---

`search_files` and `find_files` rooted inside `node_modules` see the package's `dist/`, and `find_files` no longer returns nothing there.
