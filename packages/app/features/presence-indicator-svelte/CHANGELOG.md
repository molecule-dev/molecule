# @molecule/app-presence-indicator-svelte

## 1.1.3

### Patch Changes

- Use the shared React-compatible inline style helper.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- The default accessible label is looked up through the active locale's presence keys instead of a fixed English string, with the status word translated too. An explicit `ariaLabel` still overrides it.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-presence-indicator-react`: the same exports and props, rendering the same DOM.
