# @molecule/api-resource

## 1.0.5

### Patch Changes

- adbb585: An Express 5 `Request` is now assignable to `MoleculeRequest` without a cast (`params` accepts `string | string[]`, as Express declares), so handlers can pass `req` straight to functions such as `authorization.set`.

## 1.0.4

### Patch Changes

- 5264569: The package reference now states the handler contract up front: a handler returns `{ statusCode, headers?, body }` and never writes to `res`, so `createRequestHandler` is what applies it — with the three lines to write when a handler is called directly.

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
  - @molecule/api-bond@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-locales-resource@1.0.1
  - @molecule/api-utilities-validation@1.0.1
