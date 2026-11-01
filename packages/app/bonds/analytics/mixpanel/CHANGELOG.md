# @molecule/app-analytics-mixpanel

## 1.0.4

### Patch Changes

- Snapshot and scrub credentials at HTTP, logger, analytics and browser-SDK emission boundaries while preserving safe data and notification controls.
- Scrub identify and people SDK payloads across immediate, batched, and beacon transports while preserving existing hooks.
- Scrub event, people, group, and skip-hook identify payloads at their final SDK hooks with one walk for ordinary events.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-analytics@1.0.1
