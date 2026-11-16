# @molecule/app-secret-row-angular

## 1.2.0

### Minor Changes

- Copy through `@molecule/app-clipboard`, now a peer dependency, so copying works where the Clipboard API is missing or refuses, and the copied state shows only after a successful copy. The expired tag uses the theme error tone, which needs `@molecule/app-ui` 1.4.0.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-secret-row-react`: the same exports and props, rendering the same DOM.
