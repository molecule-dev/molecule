---
'@molecule/api-ai-tools': patch
---

`find_files` accepts one brace group of comma-separated alternatives in `pattern` (up to 16), such as `*.{ts,tsx}`, instead of refusing it.
