---
'@molecule/api-staging-docker-compose': patch
---

Docker Compose commands are now time-bounded, so an unresponsive Docker daemon fails the call instead of leaving `up`, `down` or health checks pending indefinitely.
