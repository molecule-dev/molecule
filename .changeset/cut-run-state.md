---
'@molecule/api-ai-tools': patch
---

A command a budget stopped reports `status: 'cut_at_budget'` instead of the pipeline's `exitCode: 0` — with the bound that stopped it, how far the runner's own output shows it got, and the last line it printed — so a suite killed at a `timeout` behind a `| tail` is readable as the run that did not finish: `commandRunState`, `cutRunFacts` and `cutRunSentence` are the readers.
