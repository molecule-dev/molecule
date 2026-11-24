# @molecule/app-header-vue

## 1.2.1

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.2.0

### Minor Changes

- Add the `navigation` prop: a named navigation landmark with one router link per destination, taking the link props `@molecule/app-header-react` takes.

## 1.1.0

### Minor Changes

- Add `@molecule/app-header-vue`, `@molecule/app-header-solid`, `@molecule/app-header-svelte` and `@molecule/app-header-angular`: the app-shell header (branded logo and app name, slotted actions) for Vue, Solid, Svelte and Angular, matching `@molecule/app-header-react`.
