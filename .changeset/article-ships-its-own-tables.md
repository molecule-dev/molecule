---
'@molecule/api-resource-article': patch
---

The package ships the `reactions` and `follows` tables it reads, so a project that installs only `@molecule/api-resource-article` creates every table its endpoints need — favorites and the followed-authors feed answered `no such table: reactions` before.
