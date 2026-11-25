# @molecule/app-search-ui-react

## 5.0.0

### Major Changes

- Uses portable input refs and keyboard and link events, and reveals the active search result in its scroll viewport. Requires `@molecule/app-ui-react` 4.7.0 and `@molecule/app-ui` 1.9.0.

## 4.1.1

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.

## 4.1.0

### Minor Changes

- Add QuickSearchDialog's `label` (its accessible name, "Search" by default), announce the keyboard-active result, and translate the search syntax examples.

## 4.0.2

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 4.0.1

### Patch Changes

- Every clickable surface is reachable and operable from the keyboard and named for screen readers, using native buttons and radios where they fit.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-ui-react@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0
- @molecule/app-ui-react@2.0.0

## 1.0.2

### Patch Changes

- The search tips moved into a help icon inside the field (hover or focus shows the syntax); `afterField` renders the consumer's own controls, such as tabs, directly under the input.

## 1.0.1

### Patch Changes

- 44ba621: Search box with filter chips and tips, ranked results with matched terms marked, and a quick-search dialog, all on ClassMap search tokens.
