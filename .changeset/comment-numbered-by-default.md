---
'@molecule/api-resource-comment': minor
---

`createComment()` allocates the comment's sequential number as it creates the comment, so `commentNumbers()` and `getCommentByNumber()` see every comment this package writes; `createNumberedComment()` is the same create under its original name.
