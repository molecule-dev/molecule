# @molecule/api-server-default-express

## 1.0.3

### Patch Changes

- 240411e: HTTPS mode now loads `pem` correctly from this ES module and says how to install it when missing; `pem` is declared as an optional peer dependency.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-error-tracking@1.0.1
  - @molecule/api-logger@1.0.1
  - @molecule/api-middleware-body-parser@1.0.1
  - @molecule/api-middleware-cookie-parser@1.0.1
  - @molecule/api-middleware-cors@1.0.1
  - @molecule/api-secrets@1.0.1
