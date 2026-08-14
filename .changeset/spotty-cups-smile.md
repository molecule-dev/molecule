---
'@molecule/app-ide-react': patch
---

A preview UI command posted while the preview iframe is reloading is now re-sent as soon as the iframe reports back, so preview tools no longer time out in a hidden tab.
