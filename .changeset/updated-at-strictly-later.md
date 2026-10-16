---
'@molecule/api-resource-article': patch
'@molecule/api-resource-comment': patch
---

An update always moves `updatedAt` forward, even in the same millisecond as the previous write.
