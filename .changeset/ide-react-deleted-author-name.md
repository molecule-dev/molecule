---
'@molecule/app-ide-react': patch
---

A chat message whose author account was deleted (an `author` with a name but no id) renders its name as plain text instead of a profile button, so the click no longer opens the viewer's own profile.
