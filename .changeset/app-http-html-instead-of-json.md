---
'@molecule/app-http': patch
---

A JSON request answered with an HTML document now throws an `HttpError` naming the page server and the client's `baseURL`, instead of resolving with the HTML as `data`; `getClient()` warns once when it mints its no-baseURL fallback.
