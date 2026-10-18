# @molecule/api-code-sandbox-flyio

## 1.3.1

### Patch Changes

- cf2a646: A detached command's output is collected in length-checked chunks, so a large stdout the Fly API silently truncates is retried in smaller reads instead of being returned short.

## 1.3.0

### Minor Changes

- d0e9e17: A caller can hold a sandbox awake for one provisioning window: `SandboxConfig.idleAction` sets the idle policy for a single sandbox, `Sandbox.setIdleAction` changes it in place, and `SandboxProvider.defaultIdleAction` reports the steady-state policy to restore afterwards.

## 1.2.10

### Patch Changes

- 180b410: An exec Fly refuses with `412 failed_precondition: machine not running` is retried when Fly's own Machines API reports the Machine `started`, `starting` or `replacing` — the exec endpoint lagging a Machine that is up, which a single repeat clears, instead of a failed operation. A Machine reported `stopped`, `suspended` or `destroyed` still fails at once. `isTransientExecPrecondition` takes the Machine's state as an optional second argument to make that call.

## 1.2.9

### Patch Changes

- `exec` retries the `412 failed_precondition: exec request failed` Fly answers when it drops the connection to a Machine's exec agent — up to four attempts with 1 s / 3 s / 7 s backoff, each preceded by a Machine-state read and a wait for `started` when the Machine has not got there — instead of failing the whole boot or deploy on one dropped connection. A 412 that names a Machine state (`machine not running`) is still never retried, and every 412 that is not retried now reports the Machine's current state in its message.

## 1.2.8

### Patch Changes

- 80c5708: Creating a Machine retries a 412 "volume already claimed" while Fly releases the volume of a Machine that was just destroyed.

## 1.2.7

### Patch Changes

- 2fdf4a1: A create whose Machine never reaches the running state now destroys that Machine before failing, so a failed boot no longer leaves a billed Machine behind holding the app's volume.
- 58a626d: A sandbox boot that fails while allocating its Flycast private routes now releases the addresses it had already allocated, instead of leaving them behind on the target apps.
- c35c4b9: A failed archive import no longer leaves its partial download in the sandbox, and a boot that fails after allocating its Flycast private routes on an existing app now releases those addresses instead of stranding them.
- 4c23657: A file import that fails after uploading its archive removes that object from the object store instead of leaving it behind.
- eb9de0a: Test coverage for the import archive's success-path cleanup: the uploaded object is removed after a successful object-store import, and a removal that fails is logged with its key.
- 1f3a826: A failed cleanup of an uploaded import archive now logs a warning naming the object left behind, matching the failure path, instead of a debug line.
- 2e76b61: A file import that fails while writing the archive now removes its temporary archive from the workspace instead of leaving it behind.
- e913685: `list()` now reports a 404 from the org-wide Machine listing as a failed query instead of answering an empty list, so a caller reconciling from the result cannot read an unknown org as "no sandboxes".

## 1.2.6

### Patch Changes

- a9ef15a: A failed `importFiles` extract now removes the staged archive instead of leaving it behind — on the workspace volume for the chunked fallback, in the sandbox's `/tmp` for the object-store path — while still failing with tar's real exit code.
- 26ae802: `start()`/`wake()` on a Machine that is still booting now waits until it is running instead of resolving early, so the first command after the call no longer fails with "machine not running".

## 1.2.5

### Patch Changes

- fbd612e: get() now throws when the Fly API cannot be reached, so a transient failure is no longer reported as a missing sandbox.

## 1.2.4

### Patch Changes

- get() now throws when the Fly API cannot be reached, so a transient failure is no longer reported as a missing sandbox.

## 1.2.3

### Patch Changes

- 9a94727: `destroy()` now reports a failed machine or app delete instead of swallowing it, so a caller can retry; a 404 still counts as already gone.

## 1.2.2

### Patch Changes

- `create()` deletes the app it created when a later step fails (for example, the organization has reached its Machine limit), so a failed create no longer leaves an empty app, its addresses and its volume behind. An app that existed before the call is never deleted.

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
