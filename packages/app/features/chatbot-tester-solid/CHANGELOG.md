# @molecule/app-chatbot-tester-solid

## 1.1.1

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.
- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-chatbot-tester-react`: the same exports and props, rendering the same DOM.
