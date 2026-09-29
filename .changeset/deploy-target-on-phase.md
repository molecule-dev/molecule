---
'@molecule/api-deploy-target': minor
'@molecule/api-deploy-target-s3': minor
---

Deploy requests accept an optional `onPhase` callback reporting `building` and `publishing` transitions; the S3 bond reports `publishing`.
