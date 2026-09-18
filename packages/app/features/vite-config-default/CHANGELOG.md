# @molecule/app-vite-config-default

## 1.1.0

### Minor Changes

- 1951d41: Dev-server host protections are now environment-detected. Inside molecule preview containers (`/etc/mol` present, or `VITE_HOST` set) the config keeps the wide-open posture (`0.0.0.0`, `allowedHosts: true`, `fs.strict: false`) the IDE preview depends on. Everywhere else — a developer machine running `npm run dev` — it now defaults to `host: 'localhost'`, Vite's Host allowlist (localhost variants; extend via `VITE_ALLOWED_HOSTS=a,b`, disable with `*`), and Vite's strict `fs` confinement, closing the LAN-exposure / DNS-rebinding / `/@fs/` read triad the old defaults shipped.

## 1.0.3

### Patch Changes

- ddd13ed: Exclude the Playwright `e2e/` suite from vitest collection (`test.exclude`), so `npm test` in an app runs only its unit tests.

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
