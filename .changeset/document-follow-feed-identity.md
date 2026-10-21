---
'@molecule/api-resource-article': patch
'@molecule/api-resource-follow': patch
---

Document the user identity the followed-authors feed and `follow` share: for `targetType` `'user'`, `follows.targetId` is the target's user id (the value `articles.authorId` holds), so a username or display handle must be resolved first.
