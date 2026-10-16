# @molecule/api-resource-status-page

## 1.0.3

### Patch Changes

- 733afff: The package reference now names all four tables it owns and the column that joins them: `checks`, `incidents` and `uptimeWindows` each carry a `serviceId` naming a `services.id`.

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
  - @molecule/api-locales-status-page@1.0.1
  - @molecule/api-monitoring@1.0.1
  - @molecule/api-notifications@1.0.1
  - @molecule/api-permissions@1.0.1
  - @molecule/api-resource@1.0.1
  - @molecule/api-scheduler@1.0.1
