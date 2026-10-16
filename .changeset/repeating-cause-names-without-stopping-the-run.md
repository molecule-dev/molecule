---
'@molecule/api-ai-tools': patch
---

`wait_for_task`'s repeating-cause note now tells a run to KEEP GOING. It still names the cause at the third same-shaped failure so the fix can start mid-run, but the run is the only thing that names its OTHER causes, so the note tells the executor to let it finish and gives a stop command only when the cause is failing the whole run — every failure sharing it, across three spec files or more, with nothing passing since the first (an app that is not up, a 5xx on every request, a selector missing on every page). A finished run whose log holds failures now also comes back with a note grouping them by cause, one line per cause with the tests it hit, so one round of fixes covers every cause the run found.
