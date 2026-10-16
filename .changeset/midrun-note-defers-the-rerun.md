---
'@molecule/api-ai-tools': patch
---

`repeatingFailureNote` no longer offers the failing test as something to run while the run is
still walking — a second suite run against the same app and database is refused — and names the
exact re-run command to send once the run ends instead: the running command, narrowed to that
test, in the directory the run was started in. The rule behind that refusal is now shared with
the caller rather than restated: `suiteRunInTheWay` answers whether a second suite run may start
beside the runs already in flight, and it, `suiteCommandTarget` and `scopedRerunCommand` live in
this package so both the note and the hold that enforces it read one implementation.
