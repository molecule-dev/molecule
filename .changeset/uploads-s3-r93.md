---
'@molecule/api-uploads-s3': patch
---

`headFile` throws `NoSuchBucket` for a missing bucket instead of answering "no object"; `partSizeBytes` sets the multipart part size for bodies above the default ~48.8 GiB ceiling.
