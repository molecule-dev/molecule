---
'@molecule/app-http': patch
---

Recognize compatible auth failures with `isHttpError` while keeping request bodies and credentials out of `HttpError` logging metadata.
