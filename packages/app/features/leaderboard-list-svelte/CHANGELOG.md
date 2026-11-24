# @molecule/app-leaderboard-list-svelte

## 2.0.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 2.0.1

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 2.0.0

### Major Changes

- `LeaderboardList` now takes its rows as data in `items` and renders one entry through its `children` snippet, so an empty list renders `emptyState` as React's does.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-leaderboard-list-react`: the same exports and props, rendering the same DOM.
