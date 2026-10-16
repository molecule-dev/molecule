# @molecule/app-http

## 1.1.2

### Patch Changes

- c3943ab: An HTTP request made while the session is still being restored now waits for that restore instead of being sent without credentials, so a page that fetches viewer-dependent data on mount — a profile's `following` flag, a feed, a `favorited` state — cannot answer for an anonymous viewer on a connection slow enough for the restore to lose the race. `@molecule/app-http` and `@molecule/app-http-axios` await a registered gate before every request (`setAuthGate` / `awaitAuthGate`); `@molecule/app-auth`'s client exposes `whenRestored()`, which resolves once the `initialize()` restore has settled and immediately when none is in flight; the default auth bonds register it, and an app with its own session module registers its own.

## 1.1.1

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.1.0

### Minor Changes

- 0e2d12e: The client config takes `authScheme` for APIs that read `Authorization: Token <jwt>` instead of `Bearer`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
