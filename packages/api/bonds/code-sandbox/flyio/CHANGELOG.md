# @molecule/api-code-sandbox-flyio

## 1.0.3

### Patch Changes

- 20790e0: Fix Flycast private-address allocation: omit `org_slug` from the `ip_assignments` request. Fly derives the org from the target app and rejects an explicit `org_slug` with 400 "organization not found", which blocked every sandbox from reaching its database. App creation still sends `org_slug` (that endpoint requires it).
