# @molecule/app-routing-sveltekit

## 2.1.0

### Minor Changes

- Send signed-out visitors to the configured sign-in page when an unauthenticated GET returns 401, through `@molecule/app-routing`'s shared rule.
- Adds `MoleculeRouterProvider`, `useMoleculeRouter`, `useMoleculeNavigate`, `useMoleculeQuery`, `useIsActive`, `useListRoute`, `useConsumedSearchParam` and `ListRouteNav`, matching the React Router bond.

## 2.0.0

### Major Changes

- Support SvelteKit 3: `createSvelteKitNavigation` takes kit's `$app/state` `page` and a `rootHref` (`resolve('/')` from `$app/paths`) in place of `$app/stores` and `replaceState`.
