# @molecule/api-code-sandbox-e2b

## 1.2.0

### Minor Changes

- 95b459b: Persist a project's files beyond its sandbox: `create()` mounts a named volume at a caller-chosen path, `createVolume`/`removeVolume`/`volumeExists`/`listVolumes` manage volumes, and `commitTemplate`/`getTemplate`/`listTemplates`/`removeTemplate` capture and restore sandboxes as E2B snapshots.
- e935836: Adds `spawn()` — a long-running process with streaming stdout/stderr, writable stdin and `kill()`, plus `pty: { cols, rows }` for a real terminal where Ctrl-C interrupts the foreground job and `resize()` renegotiates the width. `exec()` now starts every command in the background and waits on its handle, so a launch that leaves a detached child behind returns its real exit code immediately instead of blocking until the deadline, and a command ending in `&` reports its actual output and exit code instead of a fabricated success.

### Patch Changes

- 0d4a6b7: `exec()` no longer blocks for its whole timeout when a command leaves something behind holding its output stream — a detached supervisor, a daemon that keeps its descriptors. It now checks whether the started process is still running and returns as soon as the command itself is over.
- e034e49: `hibernate()`, `stop()` and `sleep()` now pause the sandbox or throw — an SDK build with no pause method used to resolve a success-shaped `noop` outcome while the sandbox kept running. They prefer the supported `pause()` over the deprecated `betaPause()`, and treat an already-paused sandbox as success.
- 8adb020: Correct the docs: `verifyEgress` is implemented and observes egress from inside a throwaway sandbox, rather than being unimplemented.

## 1.1.0

### Minor Changes

- b87a556: `get()` now returns `null` only for a sandbox that does not exist and throws on any other failure, a new `describe(id)` reads a sandbox's record without connecting (so a status check never resumes a paused sandbox, and a paused one reports `sleeping`), and sandboxes are created with `onTimeout: pause` instead of E2B's default `kill`. `list()` skips paused sandboxes rather than waking them.

### Patch Changes

- d1101ec: `exportFiles(path)` now roots the archive at the last segment of `path` (`my-app/…`), matching the core contract and the Docker bond, and shell-quotes paths in `exportFiles`/`importFiles`.

## 1.0.4

### Patch Changes

- Declare `@bufbuild/protobuf` (the major the E2B SDK's Connect RPC chain requires) so installs that skip automatic peer resolution — e.g. `legacy-peer-deps` — still place a compatible copy on the resolution path.
