---
'@molecule/api-ai-tools': patch
---

Treat `tsconfig.json`, `tsconfig.*.json` and their `jsconfig` counterparts as JSONC in the parse check that runs after a write, so the comments and trailing commas TypeScript accepts no longer report a syntax error.
