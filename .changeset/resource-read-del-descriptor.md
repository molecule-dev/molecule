---
'@molecule/api-resource': patch
---

`read` and `del` take the same resource descriptor as `create`, `update` and `query`, so `read<Props>(resource)` and `del<Props>(resource)` compile with a Zod schema and no cast.
