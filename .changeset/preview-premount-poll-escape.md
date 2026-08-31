---
'@molecule/app-ide-react': patch
---

The preview's first-load spinner can no longer sit forever without a way out: if the preview server hasn't answered after 45 seconds, the panel shows the reload / open-in-new-tab notice while it keeps polling (mounting and clearing the notice by itself when the server appears), and the 30-second stuck backstop now re-checks after wake/build holds instead of disarming permanently.
