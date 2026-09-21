---
'@molecule/app-react': patch
---

Reconciling chat history no longer drops messages the server has not persisted yet. A page-lifecycle event or a push-channel reconnect arriving between a send and its persist replaced the view with the server transcript plus only the queued messages, so a just-sent message and any session-local card disappeared until the next poll restored them.
