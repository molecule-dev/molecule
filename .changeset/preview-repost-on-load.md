---
'@molecule/app-ide-react': patch
---

`PreviewPanel`: a pending AI navigation command is re-posted when the preview iframe's `load` event fires, so a navigate can no longer outlive its reply window in a backgrounded tab (the retry interval and the bridge's frames are timer-scheduled and throttled there; the load event is not).
