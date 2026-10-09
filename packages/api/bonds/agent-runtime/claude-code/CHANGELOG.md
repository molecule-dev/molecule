# @molecule/api-agent-runtime-claude-code

## 1.1.3

### Patch Changes

- 22f9459: Importing this server-only package into a browser bundle now fails immediately with a message naming the package, instead of a confusing error from deep inside a dependency.

## 1.1.2

### Patch Changes

- 7a007e2: Agent runs validate caller input before any exec (https GitHub repo URL, GitHub token shape, bare-hostname allowlist entries), authenticate the clone through an in-sandbox git credential helper so the token never rides the clone URL or git argv, probe every allowlisted egress host plus a blocked canary, refuse sandbox providers that cannot enforce per-run egress, install the Claude Code CLI at a pinned version instead of @latest, and forward `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` to the CLI when the caller supplies them.

## 1.1.1

### Patch Changes

- b18384d: Default model is now claude-sonnet-5-5.

## 1.1.0

### Minor Changes

- cd420c3: New runtime: the Claude Code CLI in an ephemeral cloud sandbox — created for the run, destroyed before the artifact returns.
