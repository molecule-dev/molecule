# @molecule/app-contact-display-vue

## 1.1.1

### Patch Changes

- With `onClick` set, a transparent native button covers the whole row, named by the contact name, so a click, Enter or Space activates the contact. The mail and phone links and the `actions` slot sit above that button and keep their own clicks; in the Angular port the handler now takes no click event.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-contact-display-react`: the same exports and props, rendering the same DOM.
