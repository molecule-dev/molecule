---
'@molecule/api-ai-tools': patch
---

Add `commandRunsNoTests`, which tells a shell command that invokes a Playwright, Vitest or Hurl runner only to print (`--list`, `--help`, `show-report`, `codegen`, `install`, `merge-reports`) from one that runs tests. `streamingBackgroundCommand`, `isSuiteRunCommand` and `isPlaywrightRunCommand` now leave such a command exactly as it was sent instead of adding `--reporter`/`--retries=0` to it, starting it at lower priority, or backgrounding it.
