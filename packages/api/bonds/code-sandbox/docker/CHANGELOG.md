# @molecule/api-code-sandbox-docker

## 1.1.0

### Minor Changes

- ec16b9a: Map `SandboxConfig.command` onto the container's `Cmd` and `restartPolicy` onto its Docker restart policy, so a container the daemon restarts comes back running the caller's own process.
- e935836: `spawn()` accepts `pty: { cols, rows }`, creating the exec with a TTY so Ctrl-C interrupts the foreground job, streaming the raw (unmultiplexed) terminal bytes, and exposing `handle.resize({ cols, rows })`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-code-sandbox@1.0.1
  - @molecule/api-i18n@1.0.1
