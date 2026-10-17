---
'@molecule/api-resource-article': minor
---

`allTags()` returns every tag in use, and `GET /articles/tags` with no `?limit=` answers it instead of capping at the 20 most-used tags. `popularTags(limit)` keeps its top-20 default — now stated in its own docs, with `Number.POSITIVE_INFINITY` (or `allTags()`) as the whole-list call. A `GET /tags` endpoint built on the bare `popularTags()` default silently dropped every tag past the twentieth once a database held more than 20.
