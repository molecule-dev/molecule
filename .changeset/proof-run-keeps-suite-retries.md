---
'@molecule/api-ai-tools': patch
---

A whole-suite Playwright run keeps the suite's own retries even when it names an uncapped
`--max-failures=0`. Each was read as a capped diagnosis and had `--retries=0` added, so a proof
run against a deployed URL walked every failure once where the graded run retries it. Which runs
are diagnoses is now one predicate (`isDiagnosisRun`) shared with the platform's own notes, and a
run can no longer be a diagnosis to one of them and the whole suite to the other.
