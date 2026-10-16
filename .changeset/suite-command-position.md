---
'@molecule/api-ai-tools': minor
---

`commandSegments` and `runsInCommandPosition` answer what a shell command actually runs: the command is split at its pipeline and statement separators, and each segment's word in command position is read after the wrapper prefixes a shell may put in front of it (environment assignments, `sudo`/`env`/`time`/`timeout`/`nice`, `npx`/`bunx`/`pnpm dlx`, `sh`/`bash`, and a nested `sh -c '<command>'`). `commandRunsNoTests`, `isSuiteRunCommand` and `isPlaywrightRunCommand` match a runner only in that position, so a runner named as an argument to a reader — `head -30 run-api-tests-hurl.sh`, `grep -n playwright e2e/README.md` — is no longer read as an invocation.
