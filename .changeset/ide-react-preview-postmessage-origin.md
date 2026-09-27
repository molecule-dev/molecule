---
'@molecule/app-ide-react': patch
---

The preview panel's outbound postMessage bridge commands are now targeted at the preview iframe's current origin instead of a wildcard, so page-driving commands are only deliverable to the page the panel is actually talking to.
