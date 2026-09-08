---
'@molecule/app-react': patch
---

`useChat`: merging the server's history no longer keeps the optimistic copy of a message the server already holds, so a conversation's first message renders once.
