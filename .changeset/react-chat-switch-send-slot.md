---
'@molecule/app-react': patch
---

`useChat` sends a message in a newly opened conversation while the previous conversation's reply is still streaming, instead of queueing it forever.
