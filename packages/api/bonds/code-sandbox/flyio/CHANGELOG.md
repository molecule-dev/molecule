# @molecule/api-code-sandbox-flyio

## 1.2.0

### Minor Changes

- 087d356: `verifyEgress()` now reads the app's network policy back from Fly, so the verdict names every allowed port as reachable to any host — a Fly policy matches protocol and port with no destination — and reports `open` when the policy in force allows a port this provider never configured. Adds `reconcileEgressPolicy(app)`, which re-applies the current policy to an app that already exists.

### Patch Changes

- 8a62afc: Route the template object store through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so the S3 client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against the configured endpoint so a store listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
- Updated dependencies [8b35739]
  - @molecule/api-proxy-agent@1.1.0

## 1.1.0

### Minor Changes

- ec16b9a: Map `SandboxConfig.command` onto the Machine's `init.exec` and `restartPolicy` onto its restart policy, so a Machine Fly restarts comes back running the caller's own process. Adds `find()`, which enumerates managed Machines app-by-app and throws rather than returning a partial result. `selfDeliveredEnv` is validated for private routes and never written into the Machine config.

## 1.0.16

### Patch Changes

- Send only `type` (not `region`) when assigning a shared IPv4 — Fly rejects `region` for shared IPs with a 400, which left sandbox apps without a public IP so their preview URL never routed.

## 1.0.15

### Patch Changes

- Drop `org_slug` from the shared-IPv4 assignment request so each sandbox app actually gets a public IP — without it the `<app>.fly.dev` preview URL never routed and the IDE hung on "Loading preview…".

## 1.0.14

### Patch Changes

- Pace Machines API requests process-wide so a sandbox boot's burst of exec calls no longer trips Fly's account rate limit (429) and livelocks the boot.

## 1.0.13

### Patch Changes

- 2b4451e: Retry `create`'s machine POST through Fly's app-propagation 404 ("app not found") so a freshly-created app no longer intermittently fails the sandbox boot.

## 1.0.3

### Patch Changes

- 20790e0: Fix Flycast private-address allocation: omit `org_slug` from the `ip_assignments` request. Fly derives the org from the target app and rejects an explicit `org_slug` with 400 "organization not found", which blocked every sandbox from reaching its database. App creation still sends `org_slug` (that endpoint requires it).
