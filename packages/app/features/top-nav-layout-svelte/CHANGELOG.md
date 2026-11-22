# @molecule/app-top-nav-layout-svelte

## 1.2.0

### Minor Changes

- `AuthGuard`, `SidebarLayout` and `TopNavLayout` without children render the binding's `RoutedView` (the matched child route).

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.1.2

### Patch Changes

- The primary nav's aria-label is now translated, so it follows the active language, while an explicit `navAriaLabel` prop still takes precedence.

## 1.1.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-top-nav-layout-react`: the same exports and props, rendering the same DOM.
