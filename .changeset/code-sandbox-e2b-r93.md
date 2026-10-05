---
'@molecule/api-code-sandbox-e2b': patch
---

`importFiles` spools in bounded pieces whatever the chunk size it is given; `exportFiles` removes its temporary archive on failure too and names it uniquely.
