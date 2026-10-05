---
'@molecule/api-uploads-encrypted': patch
---

A multipart size limit (`limit`) or a source that closes before it ends now fails the upload instead of sealing the truncated body as a complete object; the README says what the inner store sees.
