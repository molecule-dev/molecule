---
'@molecule/app-routing-sveltekit': major
---

`MoleculeRouterProvider` gives `@molecule/app-svelte` its router, and `createSvelteKitNavigation` now takes kit's `navigating` in place of `afterNavigate` and tells the router about a navigation before the new page renders.
