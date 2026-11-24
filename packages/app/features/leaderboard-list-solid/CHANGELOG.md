# @molecule/app-leaderboard-list-solid

## 1.1.2

### Patch Changes

- A node prop is created once where the component renders it, so components inside it keep their state.

## 1.1.1

### Patch Changes

- The leaderboard list counts rows rendered through a `<For>`, so its empty state appears and disappears with the list.
- The leaderboard list renders its heading for any title React renders, an empty list included, and builds the title and actions nodes once.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-leaderboard-list-react`: the same exports and props, rendering the same DOM.
