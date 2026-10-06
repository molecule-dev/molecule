---
'@molecule/api-uploads-mirror': patch
---

A copy stream that the mirror destroys because the source failed, hit its size limit or closed early no longer raises an uncaught `error` event when a target does not listen for one; each target still receives the failure through its own error callback.
