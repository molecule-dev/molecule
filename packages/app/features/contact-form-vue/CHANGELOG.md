# @molecule/app-contact-form-vue

## 1.1.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.1

### Patch Changes

- The fields' accessible labels and the fallback failure message now come from translation keys instead of fixed English text, so they follow the active locale. The contact-form locale bond adds those keys in every language.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-contact-form-react`: the same exports and props, rendering the same DOM.
