---
'@molecule/api-code-sandbox-e2b': patch
---

A sandbox listing the adapter cannot read (an SDK shape change — a new envelope or a null) is now a thrown error instead of an empty array, so no caller mistakes an unreadable listing for "no sandboxes exist", and volume/snapshot usage checks never act on that answer.
