---
'@molecule/api-ai-tools': patch
---

`find_files` roots the search at `<path>/@scope` when the pattern starts with an npm scope under a `node_modules` directory, so `@molecule/<pkg>/package.json` lookups answer at once instead of walking the whole dependency tree into the 10 s timeout.
