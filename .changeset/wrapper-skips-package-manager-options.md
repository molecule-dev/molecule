---
'@molecule/api-ai-tools': patch
---

The command reader skips a package manager's own options and their values before the program, so `npx --prefix <dir> playwright test`, `npm exec --prefix <dir> -- playwright test`, and the `-p`/`--package`/`-c` forms classify exactly like `npx playwright test`.
