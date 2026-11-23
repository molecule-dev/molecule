# @molecule/app-root-error-boundary-angular

## 1.1.2

### Patch Changes

- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 1.1.1

### Patch Changes

- The boundary's fallback receives the caught error in JIT-compiled builds too, so it logs the error there as well.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-root-error-boundary-react`: the same exports and props, rendering the same DOM.
