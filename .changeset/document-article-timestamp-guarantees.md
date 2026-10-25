---
'@molecule/api-resource-article': patch
---

Document that `createArticle` stamps `createdAt`/`updatedAt` strictly increasing per process and `updateArticle` always moves `updatedAt` past the stored value — an app never writes those columns itself.
