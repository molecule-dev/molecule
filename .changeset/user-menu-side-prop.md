---
'@molecule/app-ui-react': patch
---

UserMenu gains a `side` prop (`'left' | 'right'`, default `'right'`). Apps whose sidebar trigger sits on the left should pass `side="left"` so the panel opens adjacent to the trigger instead of always from the right viewport edge.
