---
'@molecule/app-e2e-fixtures-default': patch
---

Every Playwright test now records rrweb DOM-mutation events alongside the video. The events are a few KB of JSON saved as `rrweb-events.json` in the test's output dir, and can be replayed deterministically through the rrweb player in the replay viewer's "DOM replay" mode — enabling programmatic DOM inspection that video cannot provide.
