---
'@molecule/app-ide-react': patch
---

`ChatPanel`: a pending `ask_user` whose tool-call block was never persisted still renders from the record — a question the user cannot see parks the turn with no way forward.
