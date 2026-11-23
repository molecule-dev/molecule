---
'@molecule/api-uploads': minor
'@molecule/api-uploads-filesystem': patch
'@molecule/api-uploads-s3': patch
'@molecule/api-uploads-encrypted': patch
'@molecule/api-uploads-mirror': patch
---

`FileInfo.filename` may be `undefined`, as multipart parsers such as busboy report it, so their file info is passed to `upload()` as it is; the providers store such a file with an empty name.
