# @molecule/app-analytics-posthog

## 1.0.6

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.5

### Patch Changes

- Prevent event observers from mutating captured transport data after credential redaction.

## 1.0.4

### Patch Changes

- Snapshot and scrub credentials at HTTP, logger, analytics and browser-SDK emission boundaries while preserving safe data and notification controls.
- Scrub autocapture DOM URLs at SDK transport and require the analytics core that provides recursive payload scrubbing.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-analytics@1.0.1
