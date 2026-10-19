---
'@molecule/api-ai-tools': patch
---

A failing assertion's awaited text is read as returned only when a response holds it as a whole JSON value or as a word, so a one-character text no longer matches part of an unrelated identifier.
