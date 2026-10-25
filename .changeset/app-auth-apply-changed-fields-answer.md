---
'@molecule/app-auth': major
---

`updateProfile()` applies an object answer onto the signed-in user field by field, with or without an `id`: each field the answer carries replaces the stored value (`null` clears it) and each field it leaves out is kept, so a changed-fields answer such as `@molecule/api-resource-user`'s `{ props }` keeps the fields the save did not touch, and a field an API clears by leaving it out of a whole answer must now arrive as `null`, sent by the API or mapped by `mapAuthResponse`.
