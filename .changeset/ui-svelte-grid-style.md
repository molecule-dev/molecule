---
'@molecule/app-ui-svelte': patch
---

`Grid` sets only the gap and template properties it is given, so `columnGap` and `rowGap` no longer clear the `gap` it set or erase the same property from the caller's `style`.
