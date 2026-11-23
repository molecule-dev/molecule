# @molecule/app-typing-indicator-svelte

## 1.1.2

### Patch Changes

- The indicator's keyframes `<style>` element is now part of the template instead of inserted into the DOM by an action, so it renders on the server too and the component never moves a node Svelte placed.

## 1.1.1

### Patch Changes

- The accessible label is looked up through the translation key `typingIndicator.aria.label` instead of a fixed English string, and an `ariaLabel` prop still overrides it.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-typing-indicator-react`: the same exports and props, rendering the same DOM.
