# @molecule/app-sidebar-layout-angular

## 1.2.1

### Patch Changes

- Renders its slots through the shared DOM placement helpers from @molecule/app-angular.

## 1.2.0

### Minor Changes

- `AuthGuard`, `SidebarLayout` and `TopNavLayout` without children render the binding's `RoutedView` (the matched child route).

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-sidebar-layout-react`: the same exports and props, rendering the same DOM.
