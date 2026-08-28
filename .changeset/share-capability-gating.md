---
'@molecule/app-ide-react': minor
'@molecule/app-locales-ide': minor
---

Add `canShare` to ChatPanel and `canManage`/`canCreate`/`canRevoke` to ShareModal so hosts that gate share-link management above the edit role can hide the /share command, header share button, and modal controls instead of surfacing requests the backend rejects; read-only viewers no longer trigger a settings write when their selected model is delisted. The locale bond adds the matching `ide.chat.share.notAllowed` message in all languages.
