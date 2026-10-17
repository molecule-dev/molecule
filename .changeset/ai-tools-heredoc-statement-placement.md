---
'@molecule/api-ai-tools': patch
---

A suite's pipeline stages are placed from the shell parse's own offsets, so a heredoc body or a quoted word in the command no longer hides a finished run's exit code; `suiteRunPipelinePlacement` reports whether a stage really follows the runner.
