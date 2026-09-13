# @molecule/api-ai-tools

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
