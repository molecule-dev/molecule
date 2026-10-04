---
'@molecule/app-ai-chat': patch
'@molecule/app-react': patch
'@molecule/app-ai-chat-http': patch
'@molecule/app-ide-react': patch
'@molecule/app-locales-ide': patch
---

Voice-dictated messages now carry a red mic badge in the chat: text dictated through the mic button flags the sent message `viaDictation` (persisted server-side, so the badge survives a reload), and the message header renders a muted-red mic beside the author name — same 16px icon box as the other header glyphs, with a "Dictated by voice" tooltip.
