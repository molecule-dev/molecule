# @molecule/app-forum-thread-row-solid

## 1.1.2

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.
- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.1

### Patch Changes

- The pin and lock marker labels and the votes, replies and views text go through i18n, with the locale bond carrying them in every language. With a click handler the whole row becomes one native button named by the thread title, so Enter and Space activate it.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-forum-thread-row-react`: the same exports and props, rendering the same DOM.
