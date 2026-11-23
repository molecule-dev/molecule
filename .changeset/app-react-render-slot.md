---
'@molecule/app-react': minor
---

Add `slot` to `@molecule/app-react/render`: it returns `undefined` for a node prop that renders nothing, so a component treats `cond && <X/>`, `[]` and an omitted prop the same way.
