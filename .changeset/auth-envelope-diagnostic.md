---
'@molecule/app-auth': patch
---

A failed login or register now warns once, naming `mapRequestBody`, when the API reports as missing exactly the fields the request sent at the top level of its body.
