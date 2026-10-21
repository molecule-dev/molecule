---
'@molecule/app-auth': patch
---

A rejected auth call's error now keeps the response's parsed `body` (nested maps, arrays and all) and HTTP `status`, so an app can show the API's own validation messages.
