---
'@molecule/api-staging-docker-compose': patch
---

Docker Compose commands now run via `execFile` with an argv array (no shell) instead of an interpolated shell string, and environment slugs are validated (`[a-z0-9-]` only) before any use — closing a command-injection path for branch-name-derived slugs.
