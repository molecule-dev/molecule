# @molecule/api-code-sandbox

## 1.5.0

### Minor Changes

- Add an optional `hostingCapabilities` declaration to `SandboxProvider` so a platform can refuse, at wiring time, a provider that cannot host long-lived publicly routable instances — instead of discovering it at a deploy's health gate.

## 1.4.0

### Minor Changes

- d0e9e17: A caller can hold a sandbox awake for one provisioning window: `SandboxConfig.idleAction` sets the idle policy for a single sandbox, `Sandbox.setIdleAction` changes it in place, and `SandboxProvider.defaultIdleAction` reports the steady-state policy to restore afterwards.

## 1.3.0

### Minor Changes

- e273dde: Optional `readFileBytes` / `writeFileBytes` on the sandbox handle for exact binary file I/O; the E2B bond implements them through the envd file API.

## 1.2.0

### Minor Changes

- ec16b9a: `SandboxConfig` gains `command` (the sandbox's main process, instead of the image's), `restartPolicy`, and `selfDeliveredEnv` (env the caller delivers itself, which a provider validates but must never persist in its own configuration).
- e935836: `spawn()` now takes `SpawnOptions`, which adds `pty: { cols, rows }` for a process with a real controlling terminal, and `SpawnHandle` gains an optional `resize({ cols, rows })` for it. Providers that cannot allocate a PTY must reject the spawn rather than return pipes, so a caller can feature-detect a terminal.

## 1.1.1

### Patch Changes

- d1101ec: Document the `exportFiles` rooting contract: archives are rooted at the last segment of the exported path, and `importFiles(dirname(path))` is the inverse.

## 1.1.0

### Minor Changes

- 6bf6951: setProvider/getProvider/hasProvider/requireProvider accept an optional provider name, so an application can bond multiple sandbox providers under the category (e.g. a separate 'production' provider alongside the dev-sandbox singleton).

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
