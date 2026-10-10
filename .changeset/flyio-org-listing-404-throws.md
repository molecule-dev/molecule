---
'@molecule/api-code-sandbox-flyio': patch
---

`list()` now reports a 404 from the org-wide Machine listing as a failed query instead of answering an empty list, so a caller reconciling from the result cannot read an unknown org as "no sandboxes".
