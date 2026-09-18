---
'@molecule/api-git-provider-github': patch
'@molecule/api-git-provider-gitlab': patch
'@molecule/api-git-provider-gitea': patch
'@molecule/api-git-provider-smolforge': patch
---

Git-host providers now validate the configured host (plain hostname or `host:port` only) before building API URLs, and repo paths are URL-encoded per segment — a host or path carrying URL structure (`/`, `?`, `@`, scheme) is rejected instead of being interpolated into a token-bearing request URL.
