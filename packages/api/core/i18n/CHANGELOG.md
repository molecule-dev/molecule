# @molecule/api-i18n

## 1.0.2

### Patch Changes

- 87e7448: Translation merges skip `__proto__`/`constructor`/`prototype` keys at every depth, so a translations source carrying a JSON-parsed own `__proto__` property can no longer write through to `Object.prototype`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
