---
'@molecule/app-ide-react': patch
---

`ShareModal` offers only the roles the host actually grants, via a new `roles` prop that defaults to `['viewer']` — a public link is an unauthenticated credential, so write access through one is opt-in. The role `<select>` renders only when there is a real choice; with one role the dialog states what the link will grant.
