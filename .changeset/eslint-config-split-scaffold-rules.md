---
'@molecule/eslint-config': patch
---

Each scaffold rule now lives in its own module under `rules/scaffold/`, and `rules/prefer-declared-clients.mjs` holds only that rule (it still re-exports `scaffoldRules`).
