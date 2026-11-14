# @molecule/app-routing

## 1.2.0

### Minor Changes

- Add `resolveListRoute`, `listRouteRedirect`, `matchRoutePattern` and `createConsumedSearchParam`, the URL-backed list and one-time query parameter rules every framework binding shares, and `toHistoryStateRecord`/`fromHistoryStateRecord` for native routers that only store an object. The browser router keeps each entry's state and location key in `history.state`, so Back restores both.

## 1.1.0

### Minor Changes

- Add `createHistoryRouter`, which builds a full `Router` on any native router's history. The browser and memory routers are built on it, so they now run navigation guards, honor `preserveQuery` and `preserveHash`, and notify each subscriber once per navigation.

### Patch Changes

- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 1.0.5

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.3

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

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
