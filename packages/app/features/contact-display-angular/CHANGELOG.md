# @molecule/app-contact-display-angular

## 1.2.1

### Patch Changes

- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 1.2.0

### Minor Changes

- With `onClick` set, a transparent native button covers the whole row, named by the contact name, so a click, Enter or Space activates the contact. The mail and phone links and the `actions` slot sit above that button and keep their own clicks; in the Angular port the handler now takes no click event.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-contact-display-react`: the same exports and props, rendering the same DOM.
