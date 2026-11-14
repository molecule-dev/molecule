---
'@molecule/app-http': minor
---

`serverErrorMessage(err)` returns the message the server sent with a failed request (its body's `error`, else `message`), so a UI can show it instead of the transport's status line.
