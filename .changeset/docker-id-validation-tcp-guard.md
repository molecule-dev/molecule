---
'@molecule/api-code-sandbox-docker': patch
---

Caller-supplied container ids are now shape-validated before being interpolated into Docker API paths (Docker hex ids, names, and `app:machine`-style ids pass; anything carrying path structure is rejected). A plain-TCP daemon endpoint selected by the ambient `DOCKER_HOST` env is refused in production unless `MOL_DOCKER_ALLOW_PLAIN_TCP=1` is set (honored with a loud warning); explicit `config.host` endpoints are unaffected.
