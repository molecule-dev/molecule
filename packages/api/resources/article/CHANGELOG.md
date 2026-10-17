# @molecule/api-resource-article

## 1.1.0

### Minor Changes

- 6fa3451: `allTags()` returns every tag in use, and `GET /articles/tags` with no `?limit=` answers it instead of capping at the 20 most-used tags. `popularTags(limit)` keeps its top-20 default — now stated in its own docs, with `Number.POSITIVE_INFINITY` (or `allTags()`) as the whole-list call. A `GET /tags` endpoint built on the bare `popularTags()` default silently dropped every tag past the twentieth once a database held more than 20.

## 1.0.7

### Patch Changes

- 733afff: The package reference now names the two tables it owns — `articles` and `article_tags` — and the column that joins them: `article_tags.articleId` = `articles.id`.

## 1.0.6

### Patch Changes

- 3bcb78c: The package ships the `reactions` and `follows` tables it reads, so a project that installs only `@molecule/api-resource-article` creates every table its endpoints need — favorites and the followed-authors feed answered `no such table: reactions` before.

## 1.0.5

### Patch Changes

- 197d316: An update always moves `updatedAt` forward, even in the same millisecond as the previous write.

## 1.0.4

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.0.3

### Patch Changes

- b70b162: `article_tags` records the order the tags were given in — a new `position` column — so a reader of the join table gets the tags in that order.

## 1.0.2

### Patch Changes

- d48ed8c: Points integer comment ids at `createNumberedComment` in `@molecule/api-resource-comment`.

## 1.0.1

### Patch Changes

- 3b922e4: A slug lookup that answers `undefined` counts as free.
