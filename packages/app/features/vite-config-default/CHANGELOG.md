# @molecule/app-vite-config-default

## 1.2.3

### Patch Changes

- Resolves every installed `@molecule/*` package to one module identity, so a provider bonded during startup stays visible to imports that reach the same package through a different install path.

## 1.2.2

### Patch Changes

- 1fa47c2: Keep service-worker registration under the app's runtime registrar.

## 1.2.1

### Patch Changes

- Clarify public API usage and configuration.

## 1.2.0

### Minor Changes

- Builds now write release-notes.json and a build-time stamp so the update banner can summarize what a new version brings.

## 1.1.7

### Patch Changes

- 0f857ae: Peer dependency ranges now accept `vite` 8 and `@vitejs/plugin-react` 6, the versions this package is built and tested with.

## 1.1.6

### Patch Changes

- f58e283: Ship a lazy per-language `loader.js` entry with every companion locale bond, load companion bonds on demand instead of all at once, precache only the app shell, and let bundlers drop unused UI components.

## 1.1.5

### Patch Changes

- 12d164d: The dev server polls for file changes inside a sandbox, so edits are picked up after a watched folder is replaced.

## 1.1.4

### Patch Changes

- In a molecule sandbox the dev server now polls the app tree instead of watching filesystem inodes, so replacing a directory (a restore, a checkout, a tool that rewrites a tree) can no longer leave it serving pre-edit modules with no reload and no error in its log. `VITE_WATCH_POLLING=1|0` overrides the choice; a developer's machine is unchanged.

## 1.1.3

### Patch Changes

- 46a8938: `vite preview` proxies `/api`, `/health` and `/socket.io` like the dev server, so the production bundle can be tested locally.

## 1.1.2

### Patch Changes

- 41df247: Pins `react` and `react-dom` to the one copy the app resolves, adds `react-router-dom` to `dedupe`, and force-includes only optimize dependencies that are installed.

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
