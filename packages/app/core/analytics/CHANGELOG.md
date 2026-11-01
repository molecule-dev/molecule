# @molecule/app-analytics

## 1.1.1

### Patch Changes

- Scrub URL and authority credentials throughout SDK payloads without classifying property names or changing non-URL identifiers.
- Capture SDK payloads as inert data and redact credential fields without changing SDK identifiers or safe URL components.
- Snapshot and scrub credentials at HTTP, logger, analytics and browser-SDK emission boundaries while preserving safe data and notification controls.

## 1.1.0

### Minor Changes

- Requires `identifyUser` for custom auth profiles without a required string `id`, preserves default client and mergeable option typing, and records sign-in events without a user ID or an identify call when the mapper returns `null` or the default `id` is missing, empty or not a string.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
