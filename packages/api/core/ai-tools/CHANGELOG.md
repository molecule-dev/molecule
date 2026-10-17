# @molecule/api-ai-tools

## 1.8.3

### Patch Changes

- 09b04f4: `exec_command` no longer blocks on a leading `sleep N` while a background task can answer it: the task's state, progress and failures so far come back at once, and the start and wait notes name `wait_for_task` instead of a hand `tail`.
- 1f2f9ca: The failure-causes recap no longer lists a test the runner counted as `flaky` among the causes to fix: a test that failed once and passed on its retry is named apart, once, so a run whose only reds were retried passes does not send the executor to chase them.
- d716b3f: A suite's pipeline stages are placed from the shell parse's own offsets, so a heredoc body or a quoted word in the command no longer hides a finished run's exit code; `suiteRunPipelinePlacement` reports whether a stage really follows the runner.
- c090ada: The installed-package guard now refuses only writes that would reach a real install: a `node_modules` entry that is a symlink (removing it deletes the link, not its target), one inside the run's own `.mol-scratch/`, or one with no `package.json` under it can be removed, while a real install stays read-only — including through a link. `installedPackageWriteRefusal` takes a filesystem probe and is async; `shellInstalledPackageProbe` builds one from a shell runner.

## 1.8.2

### Patch Changes

- aa0c741: Adds `locatedCommandSegments`, which reports each shell statement's offset and its own leading `NAME=value` words, so an environment assignment can be placed in the statement that runs a command.

## 1.8.1

### Patch Changes

- `locatedCommandSegments` reports each shell statement's offset and its own leading `NAME=value` words, so a caller can write an environment assignment into the statement that runs a suite instead of in front of the whole command.

## 1.8.0

### Minor Changes

- b94527a: A finished test run's cause note leaves out the tests the request excludes, names the ones it ignored, and hands over a narrowed re-run command for the remaining failures.

### Patch Changes

- 0148c56: A background suite's output-only filters (`grep`, `tail`, `head`, `cut`, `awk`, `sed`, …) are now dropped from its pipeline, so the log keeps every failure's own error and the reported exit code is the runner's rather than the filter's.
- d4b75bf: A diagnosis run's `--trace=retain-on-failure` now goes into the Playwright step itself, so it is still recorded when the command pipes to `tail` or ends in `grep`.
- 6ea0270: A finished test run's cause list now carries every cause the result has room for (bounded by the platform's tool-output cap), each with its first failure's `Expected:`/`Received:` lines or locator, and names any cause it had to leave out with the one command that prints its body.
- 9647bcd: A test run's closing summary now counts as finished only when it reconciles with the total the runner announced, so a run stopped part-way is reported as stopped (with how many tests it never reached) instead of handing back `exitCode: 0`; detection reads the run's untruncated output.
- e9b5834: The command reader skips a package manager's own options and their values before the program, so `npx --prefix <dir> playwright test`, `npm exec --prefix <dir> -- playwright test`, and the `-p`/`--package`/`-c` forms classify exactly like `npx playwright test`.

## 1.7.0

### Minor Changes

- 3e28465: Read a failed Playwright run's own `trace.zip` files, and hand the platform what they say: `parseTraceArtifacts` (with `traceArtifactsScript`, a dependency-free in-sandbox reader) returns each failing test's last requests with their statuses and its console errors, and `failureTraceNote` writes them as a bounded note — so a click that changed nothing is answered by `POST /api/articles/x/favorite → 401` instead of by hand-written browser probes. `diagnosisTraceCommand` adds `--trace=retain-on-failure` to a run narrowed to a part of the suite when the config it reads records traces for no failure (`suiteRecordsTraces`), never to the whole-suite proof run.

### Patch Changes

- a0ee997: A background Playwright run prints each failure's own error into its log as that test fails, not only in the summary at the end: `streamingBackgroundCommand` sets Playwright's inline-failure switch on the `list` reporter it puts a background suite on. A run that is still walking therefore carries its causes, so `grep -n -A 20 '<test name>' <log>` returns a failure's error while the suite is running instead of the `✘` row alone.
- 67faa69: `edit_file` names every replacement of a batch that does not match the file. A batch is applied all-or-nothing, so the failure now reports each bad `old_string` — its position in the batch, and where it stops agreeing with the file — in one result, instead of one replacement per round trip. Nothing is written when any of them fails.
- c60bd0b: `wait_for_task` ends a wait early — and a note hands over a stop command — only for a cause that is PROVEN by a repeated error and failing the whole run. A shared duration is reported as a lead while the wait goes on, instead of ending it.

## 1.6.6

### Patch Changes

- f32213e: A command a budget stopped reports `status: 'cut_at_budget'` instead of the pipeline's `exitCode: 0` — with the bound that stopped it, how far the runner's own output shows it got, and the last line it printed — so a suite killed at a `timeout` behind a `| tail` is readable as the run that did not finish: `commandRunState`, `cutRunFacts` and `cutRunSentence` are the readers.
- b76378c: `find_files` searches the directory a pattern names instead of walking the whole search root, and a timed-out search is reported in the tool's own words — what was searched, the limit, and a narrower `path` to try — instead of the sandbox's timeout option.
- 0bd1ff1: `exec_command`'s over-budget message now tells a stopped test suite to run in the background instead of advising "run a smaller unit per command" — a suite stopped at the limit reports no tally at all, so splitting its files measures nothing and leaves no word on which test or request never finished.

## 1.6.5

### Patch Changes

- b8129e7: The command-position reader nests: a command substitution opened inside a double-quoted string is tracked as its own context, so `DIR="$(cd "$(dirname "$0")" && pwd)"` no longer ends the statement's quotes early. Previously that line left the reader inside an unclosed substitution, and every newline after it was swallowed into one segment — `commandSegments` and `runsInCommandPosition` reported no program for the statements that followed, and a shell script whose text opens `"$( … )"` inside `"$( … )"` (a project's own test-runner script, for one) reported the runner it invokes as absent.
- 56cec2c: `edit_file` refuses a replacement whose only change is the line break at its boundary — `new_string` is `old_string` with its trailing newline added or removed — whenever the file has text on the same line there, since applying it would move that text across lines. The rest of the batch is applied, and the result carries `skippedNote` naming the replacement and how to make the change on purpose.
- 11f2676: `edit_file` reports where a not-found `old_string` stops matching the file — the diverging line, both versions of it, and the file from that point — instead of showing nearby lines the caller already matched.
- 37ab149: The file tools refuse a write whose target is inside an installed package: `write_file`, `edit_file`, `delete_file`, `rename_file` and `create_directory` answer with the package's name and one line saying why — a `node_modules` path is not the app's code, the next install replaces it and a deploy never carries it — plus how to restore the package if a file there was already overwritten. Reading those files is unchanged. The refusal is exported as `installedPackageWriteRefusal` so a consumer's shell guard can apply the same one.
- e9f389a: `repeatingFailureNote` no longer offers the failing test as something to run while the run is
  still walking — a second suite run against the same app and database is refused — and names the
  exact re-run command to send once the run ends instead: the running command, narrowed to that
  test, in the directory the run was started in. The rule behind that refusal is now shared with
  the caller rather than restated: `suiteRunInTheWay` answers whether a second suite run may start
  beside the runs already in flight, and it, `suiteCommandTarget` and `scopedRerunCommand` live in
  this package so both the note and the hold that enforces it read one implementation.
- c0630ab: A whole-suite Playwright run keeps the suite's own retries even when it names an uncapped
  `--max-failures=0`. Each was read as a capped diagnosis and had `--retries=0` added, so a proof
  run against a deployed URL walked every failure once where the graded run retries it. Which runs
  are diagnoses is now one predicate (`isDiagnosisRun`) shared with the platform's own notes, and a
  run can no longer be a diagnosis to one of them and the whole suite to the other.

## 1.6.4

### Patch Changes

- db9db5f: `wait_for_task`'s note for a stuck command now hands over the pid-only stop command — `kill <pids>`, or `kill $(cat /tmp/<taskId>.pid)` when the pid walk finds nothing — instead of a `pkill -f <taskId>.sh` chained after it. A `pkill -f` pattern matches the shell running that command as well, so the suggested stop could signal the caller's own shell and leave the run it was meant to stop. The pid tree is what the pattern was for: the detached shell and every process under it. `taskStopCommand` is exported, so every note that hands over a stop command uses this one builder.

## 1.6.3

### Patch Changes

- 7e61162: `wait_for_task`'s note for a command that is still running states each fact once: the elapsed time and the "its output is still growing" clause were each printed twice, once in the note's own lead and once in the progress sentence appended to it.

## 1.6.2

### Patch Changes

- A repeating failure is identified by its error and the element it waited for, never by how long the tests took, so timeouts on different elements are reported as the different causes they are.

## 1.6.1

### Patch Changes

- 7c67237: `read_file`, `write_file` and `edit_file` called with no arguments at all now answer that the call arrived empty and was probably truncated, instead of asking for a `path` the caller never had a chance to send. The exec_command note about a requested timeout above the tool's ceiling is attached only when the command actually came near that ceiling.
- 886d60a: The mid-run repeating-failure note names each failing test by the path the run's own log wrote — the same path its re-run hint names — instead of the shortened form, so the file a row names and the file the hint names are one file.

## 1.6.0

### Minor Changes

- 219e140: A batched `read_file` returns whole files only: one result is capped at `MAX_READ_CALL_CHARS` (60,000 characters, the ceiling a host puts on one tool result) instead of `MAX_BATCH_READ_BYTES` (200 KB). Files are returned whole up to it and every path past that is named in `note` and listed in `files` as `not returned`, so no file is ever handed back in part and the caller can see which reads it still owes. `MAX_READ_RETURN_CHARS` is now that ceiling less its envelope, `MAX_BATCH_READ_BYTES` is removed, and `serializedChars` / `linesWithinSerialized` are new: a window is sized on the text as JSON counts it, so a large read no longer arrives one newline per line over the bound it was sized for.
- 09e538d: `commandSegments` and `runsInCommandPosition` answer what a shell command actually runs: the command is split at its pipeline and statement separators, and each segment's word in command position is read after the wrapper prefixes a shell may put in front of it (environment assignments, `sudo`/`env`/`time`/`timeout`/`nice`, `npx`/`bunx`/`pnpm dlx`, `sh`/`bash`, and a nested `sh -c '<command>'`). `commandRunsNoTests`, `isSuiteRunCommand` and `isPlaywrightRunCommand` match a runner only in that position, so a runner named as an argument to a reader — `head -30 run-api-tests-hurl.sh`, `grep -n playwright e2e/README.md` — is no longer read as an invocation.

### Patch Changes

- 24305fc: A background Playwright run ends up with exactly ONE reporter that prints each failure. A run that names another printing reporter (`line`, `dot`, `basic`, `spec`) has it replaced by `list` rather than joined beside it — two of them write every test result into the log twice — while a reporter set that writes a machine format to a file (`json`, `html`, `junit`) is left exactly as it was. And `wait_for_task`'s repeating-cause note now counts DISTINCT tests: a test that two reporters printed, or that a retry failed again, is one test, so the note needs three different tests behind one cause before it names it, and it says so ("N different tests in this run have already failed the same way").
- b162c75: `wait_for_task`'s repeating-cause note now tells a run to KEEP GOING. It still names the cause at the third same-shaped failure so the fix can start mid-run, but the run is the only thing that names its OTHER causes, so the note tells the executor to let it finish and gives a stop command only when the cause is failing the whole run — every failure sharing it, across three spec files or more, with nothing passing since the first (an app that is not up, a 5xx on every request, a selector missing on every page). A finished run whose log holds failures now also comes back with a note grouping them by cause, one line per cause with the tests it hit, so one round of fixes covers every cause the run found.

## 1.5.20

### Patch Changes

- 36147b1: Add `commandRunsNoTests`, which tells a shell command that invokes a Playwright, Vitest or Hurl runner only to print (`--list`, `--help`, `show-report`, `codegen`, `install`, `merge-reports`) from one that runs tests. `streamingBackgroundCommand`, `isSuiteRunCommand` and `isPlaywrightRunCommand` now leave such a command exactly as it was sent instead of adding `--reporter`/`--retries=0` to it, starting it at lower priority, or backgrounding it.

## 1.5.19

### Patch Changes

- 2a6ec85: A backgrounded test-suite run (Playwright, Vitest or Hurl) now starts at lower CPU and IO priority, so the commands an executor sends while it runs stay responsive instead of queueing behind the suite's own workers.
- 844e722: `find_files` matches a pattern containing `/` against each file's path, so `helpers/*`, `src/**/App.tsx` and `e2e/*.spec.ts` return the files they name instead of an empty list.
- e7a04c5: A running background suite whose failures keep repeating one cause is now named while it runs: `wait_for_task` reads the live log, and at the third failure sharing a signature — the same error message, or the same duration to within half a second — it returns early with that cause, the tests it hit and the pid command that stops the run, instead of handing back the finished log minutes later. An iterating Playwright run also reports `list,line`, so each failure's own error reaches the log as the failure happens.

## 1.5.18

### Patch Changes

- 2b62b46: A background Playwright diagnosis or re-run runs with --retries=0, so each failure is walked once; the uncapped run keeps the suite's retries.

## 1.5.17

### Patch Changes

- b9df4fd: read_file steers a successful read of a package's built dist at that package's README (`read_molecule_doc`) — the pointer used to fire only when the read failed.
- a36cd68: `wait_for_task` on a task that is still running now says how long it has been running, how far its own log says it has got (when the log carries a `[done/total]` counter) and how much longer that implies, so waiting on a suite that outlasts one call is not blind.
- 7fc6bae: `wait_for_task` reads a background command's own output file again after the API process restarts.
- ba79f61: read_file returns a file whole on a second window up to the one-call bound its note states, and only once per version of the file.

## 1.5.16

### Patch Changes

- 017194a: A command that only prints source files returns it with the code-safe redaction, a TypeScript type literal is never masked, and a running `wait_for_task` asks not to edit the code under test.
- 017194a: A backslash-escaped `\|` inside a quoted pattern no longer reads as a pipe into `env`.
- deb4a8d: A non-recursive grep of named source files, or a source print piped through text filters, also gets the code-safe redaction.
- 9b2d21f: A long test run cut in the middle keeps its tally lines ("N failed", "N passed").
- b07851b: A backgrounded Playwright run is started with `--reporter=list` — and an explicit `--reporter=line` is switched to it — so each test result is written to the log as it finishes, in the shape the platform reads back.
- 9b230b2: `edit_file` reports a dropped line break only when the file proves the lines joined, so an edit that removed a blank line is no longer described as fusing two lines.
- 613dcaa: `wait_for_task` on a task that is still running returns the log's failure lines (up to 40) followed by its end, instead of only the last 3 000 bytes, so a running test suite's failures are no longer hidden below its progress lines.
- b0fcefc: `search_files` scoped to one file reports each match with its file and line.

## 1.5.15

### Patch Changes

- 3152ed6: A version string next to a secret-looking name is no longer masked in command output.
- c7e5755: `edit_file` reports a replacement that dropped the newline after the replaced text and the parse error it caused as one message: it shows the line the two lines became and says to re-send that replacement with the newline restored.

## 1.5.14

### Patch Changes

- f91ca93: `edit_file` says when nothing changed, including a replacement whose new text is identical to its old text.
- ee3741c: An empty quoted value next to a secret-looking name is no longer masked in command output.
- 938e108: `read_file` returns a small file whole when it is paged a second time.
- 938e108: `wait_for_task` shows the output so far while a command runs, and reads a command's own output file when the task log holds almost nothing.

## 1.5.13

### Patch Changes

- 5505ca9: Secret redaction no longer masks `author=…` values; `AUTH*` and `authorization` values are still masked.

## 1.5.12

### Patch Changes

- 7c270dc: A long test run's output keeps its failure blocks and tally when cut, instead of the passing progress lines.

## 1.5.11

### Patch Changes

- fb864fc: `read_file` and `list_files` give the parent-directory hint for E2B's not-found wording too, and the path-safety check retries once and names a failure that is not a timeout.
- fb864fc: A heredoc that writes a file is no longer taken for the output file of a backgrounded command.

## 1.5.10

### Patch Changes

- e3dc1cd: `edit_file` names an `old_string` that is an import block in a different order, and shows the file's actual import.

## 1.5.9

### Patch Changes

- 77168a8: A Playwright run that redirects its output to a file is started in the background.
- 3442b2a: A background Playwright run drops a trailing `| head -N`, which would cut its pass/fail count.
- b8817ae: A dependency whose package name ends in a secret keyword (`@molecule/app-auth`) no longer has its version masked.

## 1.5.8

### Patch Changes

- c451e9f: A Playwright run piped through a filter is started in the background even when it declares no time budget.
- 417b24b: A secret value cut off before its closing quote is masked up to the end of its line, without swallowing the lines after it.
- bc19aa9: A background command that redirects its own output is told where that output goes, and its stuck check reads that file.

## 1.5.7

### Patch Changes

- 4bffe01: A `.ts` file that fails to parse on JSX is told it needs to be `.tsx`.
- 564833e: edit_file says when a replacement removed the line break after the replaced text.

## 1.5.6

### Patch Changes

- c9ff45e: A command backgrounded only because it asked for more than the tool's time limit, and that finishes within `overCeilingGraceMs` (45 s), returns its output like a foreground run.

## 1.5.5

### Patch Changes

- 0ca3af3: A background command's log now fills while it runs: a trailing `| tail -N` is dropped and a Playwright run without a reporter streams with `--reporter=line`.

## 1.5.4

### Patch Changes

- 1375ccf: A blocked command's message says none of its parts ran.

## 1.5.3

### Patch Changes

- c8894f7: A TypeScript file that fails the post-write parse check reports the line and column, the offending line, and a caret.

## 1.5.2

### Patch Changes

- a90b0ae: `search_files` reads its pattern as an extended regex (`a|b`), and a pattern that is not a valid regex as plain text.

## 1.5.1

### Patch Changes

- 42b294e: `wait_for_task` no longer calls a command stuck while its output is still growing.

## 1.5.0

### Minor Changes

- ea543ca: `edit_file` accepts `replace_all` on a replacement to change every occurrence of its `old_string`.

### Patch Changes

- b975c5d: A file tool given a path outside the workspace refuses it and says how to reach it, instead of answering about the workspace root.
- 5d05ba3: `search_files` and `find_files` rooted inside `node_modules` see the package's `dist/`, and `find_files` no longer returns nothing there.

## 1.4.4

### Patch Changes

- 28219c1: A path check the sandbox could not answer now says so, instead of reading as a forbidden path.

## 1.4.3

### Patch Changes

- b525227: `exec_command` accepts an optional `description`: a one-line reason shown in place of the raw command.

## 1.4.2

### Patch Changes

- 505927b: The background-run guidance now points at `wait_for_task` (or `exec_command` with `tail`) for a task's log output — the previous text suggested `read_file`, which cannot reach `/tmp` under the default path guards, so the read always failed.

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
