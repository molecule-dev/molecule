---
'@molecule/api-staging-docker-compose': patch
---

The staging nginx config caches only content-hashed build output (`assets/`, `_app/immutable/`) for a year; every other file revalidates.
