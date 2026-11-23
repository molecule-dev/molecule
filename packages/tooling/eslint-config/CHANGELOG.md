# @molecule/eslint-config

## 1.1.2

### Patch Changes

- Each scaffold rule now lives in its own module under `rules/scaffold/`, and `rules/prefer-declared-clients.mjs` holds only that rule (it still re-exports `scaffoldRules`).

## 1.1.1

### Patch Changes

- `router-commits-with-url` also moves `StaticRouter` and `StaticRouterProvider` imports from React Router to `@molecule/app-routing-react-router`, and its messages say the bond's routers give the app the molecule router.

## 1.1.0

### Minor Changes

- Add `@molecule/eslint-config`: the ESLint flat config for Molecule workspaces (TypeScript, import order, accessibility and the `molecule-local` rules), with framework rules switched on by the workspace's own `package.json`. Each rule module is also importable as `@molecule/eslint-config/rules/<name>.mjs`.
