---
'@molecule/api-agent-transcript-autodetect': patch
---

Widen the Pi peer range to `^1.0.0` — 1.2.1 pinned the optional peer to `1.0.1`, but the bond's source version is 1.0.0, so the range refused the only version that exists (and would refuse the first published one if it lands as 1.0.0).
