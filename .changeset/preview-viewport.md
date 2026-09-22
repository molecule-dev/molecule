---
'@molecule/app-ide-react': minor
---

The preview panel now honours `molecule:viewport` from the preview bridge, so `page.setViewportSize` actually resizes the frame. The panel already read a requested size for the iframe but nothing ever set it, so every viewport request was answered with the unchanged size — phone-width layouts could not be measured from a build.
