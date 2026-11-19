# @molecule/app-bonds-default-svelte

## 1.2.1

### Patch Changes

- Accept `@molecule/app-routing-sveltekit` 2 (SvelteKit 3) and document its root-layout call.

## 1.2.0

### Minor Changes

- Wire the web clipboard by default: add `setupAppClipboardWeb()`, which `setupAllDefaultBonds()` now calls.

### Patch Changes

- Accept `@molecule/app-drag-drop-dndkit` 2.x for the drag-drop bond.

## 1.1.0

### Minor Changes

- Add `@molecule/app-bonds-default`, the framework-neutral default bond wirings, and its Vue, Solid, Svelte and Angular packages with the same exports as `@molecule/app-bonds-default-react` (`setupAllDefaultBonds`, `bootstrapApp`, the `./optional/*` setups); the React package re-exports the neutral half, so its exports are unchanged.
