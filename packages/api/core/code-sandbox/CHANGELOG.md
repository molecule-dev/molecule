# @molecule/api-code-sandbox

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
