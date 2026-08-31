---
'@molecule/app-ide-react': patch
---

The preview panel now recovers on its own after its server comes back: while the "can't load here" or "preview is blank" notice is showing, it keeps probing the preview URL and reloads automatically once the app is serving again (for example after a slow sandbox wake), instead of waiting for a manual reload.
