---
'@molecule/api-uploads-mirror': patch
---

A multipart size limit or a source that closes before it ends fails every copy instead of storing a truncated body; `uploadPromise` is marked handled for callers that rely on `onError`; uploads are tracked by their returned file as well as their id.
