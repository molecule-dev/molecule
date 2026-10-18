---
'@molecule/app-bonds-default-react': patch
---

The default auth bonds resolve the HTTP client when it is bonded instead of at setup, so a session restored before the HTTP bond exists still sends `Authorization` on the first request.
