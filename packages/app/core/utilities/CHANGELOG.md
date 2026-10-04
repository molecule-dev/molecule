# @molecule/app-utilities

## 1.0.4

### Patch Changes

- 9645fcd: `openUrl` strips leading control characters and spaces before reading the URL scheme, so a target like `\u0001javascript:…` is refused instead of passing as a relative path.

## 1.0.3

### Patch Changes

- bd70b65: `openUrl` now navigates only to http(s) or relative targets — a `javascript:`, `data:` or other scriptable scheme is refused with a `console.warn` and no navigation.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
