# @molecule/app-vite-config-default

## 1.0.2

### Patch Changes

- Claim clients when the new service worker activates, so the "Update" prompt reliably reloads onto the new build once the worker takes control. Also remove the `/api/` runtime-caching rule, which broke on streaming (SSE) responses and cached authenticated API data.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
