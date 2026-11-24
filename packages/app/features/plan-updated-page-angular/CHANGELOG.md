# @molecule/app-plan-updated-page-angular

## 1.2.0

### Minor Changes

- `PlanUpdated` takes a `receiptHref` option (default `/billing`); set it to `null` to leave the "View receipt" link out when the app has no billing page.

## 1.1.1

### Patch Changes

- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-plan-updated-page-react`: the same exports and props, rendering the same DOM.
