---
'@molecule/app-routing': patch
---

`navigate('?…')` and `navigate('#…')` stay on the current page, as React Router's do, and `getParams()` reads the registered routes when the native router matched no params.
