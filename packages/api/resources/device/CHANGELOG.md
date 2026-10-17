# @molecule/api-resource-device

## 1.0.7

### Patch Changes

- 5f74674: `DeviceService` is exported from the package root, so the interface a caller writes at the call site — `get<DeviceService>('device')` — can be imported by name rather than re-declared as an inline generic. The `types` namespace export is unchanged.

## 1.0.6

### Patch Changes

- 5264569: The package reference now states that `handlers.*` return `{ statusCode, headers?, body }` and never write to `res`, with the three lines that apply a result when a handler is called directly.

## 1.0.5

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.0.4

### Patch Changes

- 240411e: Declares its `uuid` dependency.

## 1.0.3

### Patch Changes

- dbd0dd1: The list endpoints clamp the `limit` query parameter into 1..500 — an oversized `limit` previously passed through unbounded to the store query (and the device query allowed up to 10000).

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
  - @molecule/api-locales-device@1.0.1
  - @molecule/api-resource@1.0.1
