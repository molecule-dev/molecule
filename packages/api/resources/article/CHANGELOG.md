# @molecule/api-resource-article

## 1.0.3

### Patch Changes

- b70b162: `article_tags` records the order the tags were given in — a new `position` column — so a reader of the join table gets the tags in that order.

## 1.0.2

### Patch Changes

- d48ed8c: Points integer comment ids at `createNumberedComment` in `@molecule/api-resource-comment`.

## 1.0.1

### Patch Changes

- 3b922e4: A slug lookup that answers `undefined` counts as free.
