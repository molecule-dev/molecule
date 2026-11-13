# @molecule/app-routing-react-router

## 1.2.6

### Patch Changes

- Components read translations through `useTranslation()`, so their text changes language the moment the locale switches instead of on their next unrelated re-render.

## 1.2.5

### Patch Changes

- Clarify minimal list pagination, path parameter preservation, and query ordering with exact URL examples.

## 1.2.4

### Patch Changes

- Document one `useListRoute` config serving `/`, query views and a path view such as `/topics/:topic`, so every tab link comes from `href`.

## 1.2.3

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.2.2

### Patch Changes

- Allow routing hooks to work inside any React Router router without MoleculeRouterProvider.

## 1.2.1

### Patch Changes

- Keep consumed credentials associated with their history entries during Back and Forward navigation.

## 1.2.0

### Minor Changes

- Add router wrappers that keep the URL and rendered page in step, a `lazyPage` helper that gives each on-demand page its own Suspense boundary, and a `/dom` entry for `RouterProvider` and `HydratedRouter`.
- Add a router-aware hook that retains consumed credential parameters in component state while removing them from the address.

### Patch Changes

- `lazyPage` accepts pages declared with an optional props parameter.
- Verify `useListRoute` direct catalog pages, category pagination, filter/view resets, and signed-out protected-view redirects.
- Preserve the main, `/dom`, and deep `dist` JavaScript and declaration paths for existing `import`, `require`, and TypeScript consumers.

## 1.1.3

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.2

### Patch Changes

- Document list routes that wait for restored account state before starting a viewer-specific request.

## 1.1.0

### Minor Changes

- a7283cb: Add URL-backed list pagination, filters, route selections and authentication readiness.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-routing@1.0.1
