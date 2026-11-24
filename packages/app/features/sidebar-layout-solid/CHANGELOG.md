# @molecule/app-sidebar-layout-solid

## 1.2.1

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.
- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.2.0

### Minor Changes

- `AuthGuard`, `SidebarLayout` and `TopNavLayout` without children render the binding's `RoutedView` (the matched child route).

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-sidebar-layout-react`: the same exports and props, rendering the same DOM.
