---
'@molecule/app-routing': patch
---

`getParams()` returns decoded params when the history matches routes itself (the memory and browser routers), as React Router's `useParams` does.
