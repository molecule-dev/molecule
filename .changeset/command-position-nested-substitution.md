---
'@molecule/api-ai-tools': patch
---

The command-position reader nests: a command substitution opened inside a double-quoted string is tracked as its own context, so `DIR="$(cd "$(dirname "$0")" && pwd)"` no longer ends the statement's quotes early. Previously that line left the reader inside an unclosed substitution, and every newline after it was swallowed into one segment — `commandSegments` and `runsInCommandPosition` reported no program for the statements that followed, and a shell script whose text opens `"$( … )"` inside `"$( … )"` (a project's own test-runner script, for one) reported the runner it invokes as absent.
