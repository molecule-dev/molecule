# @molecule/app-plan-updated-page-vue

## 1.2.1

### Patch Changes

- The `receiptHref` prop is typed `string | null`, so a template can pass `null` to leave the receipt link out.

## 1.2.0

### Minor Changes

- `PlanUpdated` takes a `receiptHref` option (default `/billing`); set it to `null` to leave the "View receipt" link out when the app has no billing page.

## 1.1.1

### Patch Changes

- Examples mount the binding's `MoleculeProvider` inside the routing bond's `MoleculeRouterProvider`.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-plan-updated-page-react`: the same exports and props, rendering the same DOM.
