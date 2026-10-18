---
'@molecule/api-ai-tools': patch
---

A whole-suite run whose first three tests, in three different spec files, each fail waiting for their own first element with nothing passing in between is stopped as a page that renders nothing — naming the page's thrown error — instead of walking the rest of the suite against it.
