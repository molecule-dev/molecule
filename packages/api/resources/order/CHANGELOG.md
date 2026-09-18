# @molecule/api-resource-order

## 1.1.0

### Minor Changes

- 36fb629: `create()` now re-resolves unit prices server-side when the data store exposes a `products` table: catalog prices (honouring `product_variants` overrides) compute `subtotal`/`total` and are persisted on the order items, client-supplied `items[].price` is discarded, and items referencing products missing from the catalog are rejected with 400. When no `products` table exists the previous behavior (body prices) is unchanged; `discount`/`tax`/`shipping` remain client-supplied in both modes.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-database@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-logger@1.0.1
  - @molecule/api-resource@1.0.1
