---
'@molecule/app-routing-react-navigation': patch
---

`navigate()` to a path no screen in `linking.screens` matches logs an error naming the path instead of doing nothing.
