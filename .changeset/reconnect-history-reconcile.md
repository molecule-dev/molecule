---
'@molecule/app-react': patch
---

Chat broadcasts missed while the push channel was down (e.g. a teammate's note against a backgrounded tab) are reconciled from the persisted transcript when the channel reconnects.
