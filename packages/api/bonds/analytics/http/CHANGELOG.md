# @molecule/api-analytics-http

## 1.0.3

### Patch Changes

- bd89471: Every emit now releases the response body it never reads, instead of holding a connection until garbage collection on each call against a dead or erroring endpoint.

## 1.0.2

### Patch Changes

- 22f9459: Importing this server-only package into a browser bundle now fails immediately with a message naming the package, instead of a confusing error from deep inside a dependency.

## 1.0.1

### Patch Changes

- Updated dependencies [9237172]
  - @molecule/api-analytics@1.1.0
