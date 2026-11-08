---
'@molecule/app-http': minor
'@molecule/app-http-axios': patch
---

Add `keepalive` to `RequestConfig` so a request can outlive a navigation or page close; the Axios provider sends it through its fetch adapter.
