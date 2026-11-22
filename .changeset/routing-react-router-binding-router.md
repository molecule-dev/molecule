---
'@molecule/app-routing-react-router': minor
---

`MoleculeRouterProvider` gives `@molecule/app-react` its router and React Router's `Outlet` as the routed view; the bond's router components and data-router `RouterProvider` render one, a provider inside another joins it, and `useMoleculeRouter().getParams()` answers with the params of the calling component's route.
