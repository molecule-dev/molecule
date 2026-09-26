# @molecule/api-ai-tools

## 1.4.1

### Patch Changes

- 3659fb9: An ambiguous edit_file old_string now reports the lines it matched.
- 3164c42: The blocked environment-dump message now shows how to check whether one variable is set without printing it.
- 6787825: list_files on a missing path now answers with what the parent directory contains.
- a4809c7: read_file on a missing @molecule README in node_modules points at read_molecule_doc.

## 1.4.0

### Minor Changes

- c0acaf7: exec_command runs a command that asks for more time than its ceiling, with output held until the end, in the background (returning a task id) instead of refusing it.

## 1.3.0

### Minor Changes

- 3cdba83: `edit_file` results now include the edited regions as they read after the edit, with line numbers and the file's total line count; `write_file` results include the line count and, for a small file, its numbered lines.

## 1.2.1

### Patch Changes

- f0d4cdf: `edit_file` reports an edit whose change is already in the file as applied, instead of failing with "old_string not found".
- 9583ff4: A budgeted command now returns as soon as it finishes, even when it left a background process holding its output.

## 1.2.0

### Minor Changes

- 91d8c91: `write_file` and `edit_file` parse the file they just changed (`node --check`, `JSON.parse`, or esbuild for TypeScript) and return the syntax error in the same result as `syntaxError`, so an edit that breaks a file is reported while the edit is still in front of the agent instead of at the next build.

## 1.1.0

### Minor Changes

- 84ed223: `read_file` now accepts `paths` (an array) as well as `path`, returning one entry per file with its own content or error. An agent that issues one tool call per round-trip pays a full round-trip per file; batched, a project survey costs one call per 25 files.
- 939feb6: `exec_command` accepts `run_in_background`: the command is detached and the tool returns a task id, a log path and an exit-code path immediately, so a long test suite or build no longer has to fit inside the command timeout.
- 093c10b: `read_file` takes `offset`/`limit` to return a line window (a negative `offset` counts from the end, like `tail`), and `search_files` takes `contextLines` to return surrounding lines like `grep -C`. Both report their position so the next window can be requested.
- 7d9fbb0: Accept common parameter aliases on every tool (`cmd` for `command`, `file` for `path`, `body` for `content`, camelCase for snake_case) and return an actionable error instead of an internal TypeError when a required parameter is missing. `exec_command` now also accepts an optional `timeout`, clamped to the tool's ceiling and reported when a larger one is asked for. New exports: `guardAITool`, `guardToolExecute`, `normalizeToolInput`.
- 2199f2b: New `wait_for_task` tool: waits for a command started with `run_in_background` and returns its output and exit code in one call, so an executor that needs the result no longer has to sleep and re-read the log.

### Patch Changes

- 5ba66dd: `edit_file` now finds a block whose `old_string` differs from the file only in spacing next to punctuation (a missing space after a comma, for example), as it already did for indentation; uniqueness is still required and the replacement is applied verbatim.
- 2885ec0: When `edit_file`'s `old_string` does not match, the error says which kind of miss it was: none of its lines are in the file (already applied, or wrong file — do not retry the same string) versus present but not distinctive enough to locate. The old message advised re-reading and copying exact text in both cases, which is wrong advice for the first.
- 571bc5a: `exec_command` refuses, without running, a command that declares a longer budget than the tool's ceiling _and_ pipes its output into `tail`/`grep` — that combination can only spend the whole budget and return nothing. A command that declares no budget, or whose partial output would survive, still runs as before.
- ceea87a: `find_files` and `search_files` accept `@` in a glob, so a scoped package path like `node_modules/@molecule/app-ui/*` is no longer refused.
- a3250df: `read_file` returns at most ~80 KB per file when no window is asked for — the first window plus a note on how to read the rest — instead of a whole multi-megabyte file; a batched read is bounded to ~200 KB.
- dce6c1f: `read_file`'s window note now says when the whole file fits in one call, or names the exact next window; its description points `@molecule` package docs at `read_molecule_doc`.
- 1849fb3: `wait_for_task` reports a background command as stuck — with its pid, so it can be killed — once five minutes of waiting have accrued on it without an exit, and refuses to wait on it again.

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
