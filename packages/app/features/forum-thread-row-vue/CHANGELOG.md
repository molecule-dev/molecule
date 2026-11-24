# @molecule/app-forum-thread-row-vue

## 1.1.3

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.2

### Patch Changes

- The pin and lock marker labels and the votes, replies and views text go through i18n, with the locale bond carrying them in every language. With a click handler the whole row becomes one native button named by the thread title, so Enter and Space activate it.

## 1.1.1

### Patch Changes

- Requires Vue 3.5 or later, the first release with `useId`.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-forum-thread-row-react`: the same exports and props, rendering the same DOM.
