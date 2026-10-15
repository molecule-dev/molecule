---
'@molecule/api-ai-tools': patch
---

`search_files` reads its pattern as an extended regex (`a|b`), and a pattern that is not a valid regex as plain text.
