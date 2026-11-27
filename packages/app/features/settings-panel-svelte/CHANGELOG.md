# @molecule/app-settings-panel-svelte

## 2.0.2

### Patch Changes

- Uses the dedicated feature imports from the framework binding.

## 2.0.1

### Patch Changes

- `BillingSection` with no `plan` shows the translated `settings.billing.freePlan` instead of an English "Free".

## 2.0.0

### Major Changes

- `BillingSection` requires `upgradeTo`, the page its Upgrade button opens, instead of defaulting to `/settings`; without one it shows no Upgrade button.

### Minor Changes

- `TiersUpgradeSection` offers Upgrade only when a price is for sale, reads the plan and `isFree` from the billing status (reloading it after a cancel), and shows a failed cancel in the section.

## 1.2.0

### Minor Changes

- `AuthSection` takes a `twoFactor` option (default `true`); set it to `false` to hide two-factor settings when the API has no two-factor provider.

## 1.1.3

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.

## 1.1.2

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.
- Examples mount the binding's `MoleculeProvider` inside the routing bond's `MoleculeRouterProvider`.

## 1.1.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.0

### Minor Changes

- Add `@molecule/app-settings-panel-vue`, `@molecule/app-settings-panel-solid`, `@molecule/app-settings-panel-svelte` and `@molecule/app-settings-panel-angular`: the composable settings panel and its section components for Vue, Solid, Svelte and Angular, matching `@molecule/app-settings-panel-react`.
