---
'@molecule/app-ide-react': patch
---

`PreviewPanel`: a raw document the user clicks to inside the preview (a feed, a JSON file, `llms.txt`) is shown as content instead of being covered by the "preview is blank" notice; the bridge reports the link click as a navigation intent.
