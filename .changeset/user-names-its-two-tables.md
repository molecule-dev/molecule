---
'@molecule/api-resource-user': patch
---

The package reference now names the two tables it owns — `users` (props only, no password column) and `usersSecrets` — and the key that joins them: `usersSecrets.id` is the user's id, never a fresh uuid. It also names the handlers to call for signup, login and password changes instead of hand-writing both rows.
