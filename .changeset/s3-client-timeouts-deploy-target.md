---
'@molecule/api-deploy-target-s3': patch
---

The S3 client now has connection and socket-inactivity timeouts (10 s / 60 s, overridable), so a hung S3 socket can no longer stall the caller indefinitely.
