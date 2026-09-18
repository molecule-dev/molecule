# @molecule/api-ai-tools

## 1.0.8

### Patch Changes

- c71425e: Command blocking now also covers reads of `/etc/mol/…` (the molecule platform secrets directory — e.g. `cat /etc/mol/env`, `base64 < /etc/mol/env`), closing an env-dump gap alongside the existing `/proc`/`/etc/environment` rules. Building tools over a LOCAL-HOST backend with `pathGuards`/`symlinkGuards` disabled now logs a loud warning naming the exact gaps; defaults are unchanged.

## 1.0.7

### Patch Changes

- 9913377: `read_file` and `edit_file` no longer report a read that obtained no bytes as a successful read of an empty file: an empty result is checked against the file's real size, retried once when the file has content, and returned as an actionable error when the read genuinely failed or the size could not be confirmed.

## 1.0.6

### Patch Changes

- `exec_command`: when a command stops at the tool budget with a `| tail`/`| head` pipe, the error explains that the pipe held the output back and says to run it without the pipe.

## 1.0.5

### Patch Changes

- `exec_command` runs the whole anchored command under the budget (`commandBudgetMs`) inside the sandbox backend, so a sourced environment still reaches it; exit 124 hands back the partial output with an explanatory error.

## 1.0.4

### Patch Changes

- `exec_command` accepts `commandBudgetMs`: a command that overruns is stopped under `timeout` and its output so far is returned instead of nothing.

## 1.0.3

### Patch Changes

- 0ba8ccc: `exec_command` no longer blocks `env -u KEY cmd`, `env KEY=value cmd` or `env -i cmd` as environment dumps; only a bare, piped or redirected `env` is.

## 1.0.2

### Patch Changes

- 96f9d40: Secret redaction no longer rewrites ordinary source. File reads and search results now redact only `NAME=value` env assignments, so code such as `auth={authClient}` or `apiKeys: 'API keys'` is returned verbatim instead of as `[REDACTED]`. Command output and `.env` reads keep the full env-dump treatment. New exports: `redactSecretsInCode`, `isEnvFilePath`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-ai@1.0.1
