---
'@molecule/app-vue': minor
---

Adds `MoleculeProvider` and the per-service provider components (`AuthProvider`, `ThemeProvider`, …) with `@molecule/app-react`'s props; `MoleculeProvider` waits for the session by default when given `auth` (pass `awaitSession: false` to opt out), and hook result types take React's names, with the old ones kept as deprecated aliases.
