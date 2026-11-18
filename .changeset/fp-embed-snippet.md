---
'@molecule/app-embed-snippet-react': minor
---

Copying a snippet now goes through `@molecule/app-clipboard` (a new required peer), so the Copy button also works where the async Clipboard API is unavailable and the copied feedback appears only when the copy succeeded. The generated embed code is marked as untranslated code so page translation leaves it unchanged.
