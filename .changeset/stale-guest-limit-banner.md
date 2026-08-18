---
'@molecule/app-ide-react': patch
---

ChatPanel: drop a `requiresSignup` limit banner once `isAnonymous` is `false`, so a viewer who signs in mid-session no longer sees the guest-tier limit and its dead-end sign-up buttons.
