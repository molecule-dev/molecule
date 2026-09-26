---
'@molecule/app-ui': patch
'@molecule/app-ui-tailwind': patch
'@molecule/app-ui-react': patch
'@molecule/app-ui-vue': patch
---

Fleet audit fixes: add `borderL` and `alertLeftAccent` class-map tokens, implement the previously-dropped Alert `variant="left-accent"` (status-colored 4px leading bar, React + Vue), and change the button icon/spinner spacing tokens from `mr-2`/`ml-2` to `shrink-0` (the button's own `gap` already provides spacing — the stacked margins made icons sit off-center).
