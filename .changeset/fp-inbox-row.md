---
'@molecule/app-inbox-row-react': patch
---

With `onClick` set, the whole row is now one native button named by the sender and the subject, while the star toggle, selection slot and labels stay clickable above it. The star and unread colours now come from the theme's warning and info tones instead of fixed hex values.
