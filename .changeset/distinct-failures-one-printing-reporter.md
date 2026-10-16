---
'@molecule/api-ai-tools': patch
---

A background Playwright run ends up with exactly ONE reporter that prints each failure. A run that names another printing reporter (`line`, `dot`, `basic`, `spec`) has it replaced by `list` rather than joined beside it — two of them write every test result into the log twice — while a reporter set that writes a machine format to a file (`json`, `html`, `junit`) is left exactly as it was. And `wait_for_task`'s repeating-cause note now counts DISTINCT tests: a test that two reporters printed, or that a retry failed again, is one test, so the note needs three different tests behind one cause before it names it, and it says so ("N different tests in this run have already failed the same way").
