# @molecule/app-newsletter-signup-svelte

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.1

### Patch Changes

- The email field's accessible label and the failed-subscription message are looked up through translation keys instead of fixed English text, and the locale bond adds both keys in every language.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-newsletter-signup-react`: the same exports and props, rendering the same DOM.
