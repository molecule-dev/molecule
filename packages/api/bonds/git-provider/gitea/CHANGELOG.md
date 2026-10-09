# @molecule/api-git-provider-gitea

## 1.0.6

### Patch Changes

- 22f9459: Importing this server-only package into a browser bundle now fails immediately with a message naming the package, instead of a confusing error from deep inside a dependency.

## 1.0.4

### Patch Changes

- 008cc15: Git-host providers now validate the configured host (plain hostname or `host:port` only) before building API URLs, and repo paths are URL-encoded per segment — a host or path carrying URL structure (`/`, `?`, `@`, scheme) is rejected instead of being interpolated into a token-bearing request URL.
