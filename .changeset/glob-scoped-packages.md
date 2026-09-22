---
'@molecule/api-ai-tools': patch
---

`find_files` and `search_files` accept `@` in a glob, so a scoped package path like `node_modules/@molecule/app-ui/*` is no longer refused.
