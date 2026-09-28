# @molecule/app-auth

## 1.1.2

### Patch Changes

- A failed cookie-session restore (401) now clears the stale `mol_auth` presence hint, so an expired server-side session (or a DB reset) no longer re-fires a guaranteed-401 `/users/me` probe — and its console error — on every subsequent page load. The next real login re-sets the hint alongside the fresh cookie.

## 1.1.0

### Minor Changes

- e404093: `AuthClientConfig.shouldRestoreUser` lets an app reject a cookie-restored user and clear the stale presence hint, so an anonymous session cannot hydrate as a blank signed-in user. Defaults to current behaviour.

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
