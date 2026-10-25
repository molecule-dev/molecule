---
'@molecule/app-auth': patch
---

`updateProfile()` applies an answer that carries only the changed fields (no `id`, such as `@molecule/api-resource-user`'s `{ props }`) onto the signed-in user, so the stored session, every subscriber and the next save keep the fields the save did not touch.
