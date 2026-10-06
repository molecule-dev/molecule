---
'@molecule/app-code-editor-monaco': patch
---

Documents over 250,000 characters are no longer sent to the language server, so one large open file can no longer push the language-server connection into a reconnect loop.
