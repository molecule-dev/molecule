---
'@molecule/app-ui-tailwind': patch
---

`base.css` defines the `dark` variant on `[data-mol-mode='dark']`, so `dark:` utilities follow the active theme instead of the browser's color-scheme preference.
