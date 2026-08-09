# @molecule/api-code-sandbox-flyio

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
