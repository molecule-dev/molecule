# @molecule/api-code-sandbox-e2b

## 1.1.0

### Minor Changes

- b87a556: `get()` now returns `null` only for a sandbox that does not exist and throws on any other failure, a new `describe(id)` reads a sandbox's record without connecting (so a status check never resumes a paused sandbox, and a paused one reports `sleeping`), and sandboxes are created with `onTimeout: pause` instead of E2B's default `kill`. `list()` skips paused sandboxes rather than waking them.

### Patch Changes

- d1101ec: `exportFiles(path)` now roots the archive at the last segment of `path` (`my-app/…`), matching the core contract and the Docker bond, and shell-quotes paths in `exportFiles`/`importFiles`.

## 1.0.4

### Patch Changes

- Declare `@bufbuild/protobuf` (the major the E2B SDK's Connect RPC chain requires) so installs that skip automatic peer resolution — e.g. `legacy-peer-deps` — still place a compatible copy on the resolution path.
