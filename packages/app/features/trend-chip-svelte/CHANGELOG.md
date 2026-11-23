# @molecule/app-trend-chip-svelte

## 1.1.3

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.2

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.

## 1.1.1

### Patch Changes

- Status colours come from the theme's success, error and secondary tones instead of fixed hex values, and the pill preset reads the theme's inverse text colour. The chip now follows the app's palette and dark mode.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-trend-chip-react`: the same exports and props, rendering the same DOM.
