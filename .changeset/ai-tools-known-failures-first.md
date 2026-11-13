---
'@molecule/api-ai-tools': patch
---

Background Playwright feedback re-runs a file's recorded known failures first after a source write (only those tests), so a later known-failure checkpoint reuses their pass instead of running them again.
