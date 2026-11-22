# @molecule/app-bonds-default-angular

## 1.2.1

### Patch Changes

- Examples read the router through the framework binding and the routing bond's providers.

## 1.2.0

### Minor Changes

- Wire the web clipboard by default: add `setupAppClipboardWeb()`, which `setupAllDefaultBonds()` now calls.

### Patch Changes

- Accept `@molecule/app-drag-drop-dndkit` 2.x for the drag-drop bond.

## 1.1.0

### Minor Changes

- Add `@molecule/app-bonds-default`, the framework-neutral default bond wirings, and its Vue, Solid, Svelte and Angular packages with the same exports as `@molecule/app-bonds-default-react` (`setupAllDefaultBonds`, `bootstrapApp`, the `./optional/*` setups); the React package re-exports the neutral half, so its exports are unchanged.
