# @molecule/api-git-provider-github

## 1.0.4

### Patch Changes

- 008cc15: Git-host providers now validate the configured host (plain hostname or `host:port` only) before building API URLs, and repo paths are URL-encoded per segment — a host or path carrying URL structure (`/`, `?`, `@`, scheme) is rejected instead of being interpolated into a token-bearing request URL.
