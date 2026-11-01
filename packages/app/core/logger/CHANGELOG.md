# @molecule/app-logger

## 1.0.5

### Patch Changes

- Pass every Error argument to the console as a scrubbed Error, not only an error given first.
- Redact complete credential values across quote boundaries and safely capture shared or detached binary bodies.

## 1.0.4

### Patch Changes

- Snapshot and scrub credentials at HTTP, logger, analytics and browser-SDK emission boundaries while preserving safe data and notification controls.
- Scrub symbols and every serialized URL while preserving safe custom stacks and preventing inherited accessor reads during credential snapshots.
- Preserve quoted URL boundaries and safe bound stack getters while retaining native lazy-stack protection.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
