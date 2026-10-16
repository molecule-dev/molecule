---
'@molecule/api-ai-tools': patch
---

`exec_command`'s over-budget message now tells a stopped test suite to run in the background instead of advising "run a smaller unit per command" — a suite stopped at the limit reports no tally at all, so splitting its files measures nothing and leaves no word on which test or request never finished.
