# @molecule/api-agent-runtime-pi

## 1.0.1

### Patch Changes

- 7a007e2: Agent runs validate caller input before any exec (https GitHub repo URL, GitHub token shape, bare-hostname allowlist entries), authenticate the clone through an in-sandbox git credential helper so the token never rides the clone URL or git argv, probe every allowlisted egress host plus a blocked canary, and refuse sandbox providers that cannot enforce per-run egress.

## 1.0.0

### Major Changes

- Adds @molecule/api-agent-runtime-pi, a Pi coding-agent runtime for @molecule/api-agent-run that runs unattended tasks on any Pi-supported model provider in an ephemeral sandbox and returns a patch.
