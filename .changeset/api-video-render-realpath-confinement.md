---
'@molecule/api-video-render': patch
---

Media sources are checked against their real path, so a symlink inside the media root can no longer reach files outside it.
