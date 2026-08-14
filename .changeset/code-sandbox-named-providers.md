---
'@molecule/api-code-sandbox': minor
---

setProvider/getProvider/hasProvider/requireProvider accept an optional provider name, so an application can bond multiple sandbox providers under the category (e.g. a separate 'production' provider alongside the dev-sandbox singleton).
