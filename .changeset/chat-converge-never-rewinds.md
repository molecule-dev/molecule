---
'@molecule/app-react': patch
---

Applying a server transcript to a live chat can no longer rewind it. Every path that reloads history — the page-lifecycle reconcile, the remote-turn poll, the dropped-stream reconcile and the resume poll — now converges through one function that keeps the further-along copy of each message, so a turn the server has not persisted yet stays on screen and a card the user has just answered is never shown as unanswered again.
