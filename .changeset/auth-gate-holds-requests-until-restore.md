---
'@molecule/app-http': patch
'@molecule/app-auth': patch
'@molecule/app-bonds-default-react': patch
'@molecule/app-http-axios': patch
---

An HTTP request made while the session is still being restored now waits for that restore instead of being sent without credentials, so a page that fetches viewer-dependent data on mount — a profile's `following` flag, a feed, a `favorited` state — cannot answer for an anonymous viewer on a connection slow enough for the restore to lose the race. `@molecule/app-http` and `@molecule/app-http-axios` await a registered gate before every request (`setAuthGate` / `awaitAuthGate`); `@molecule/app-auth`'s client exposes `whenRestored()`, which resolves once the `initialize()` restore has settled and immediately when none is in flight; the default auth bonds register it, and an app with its own session module registers its own.
