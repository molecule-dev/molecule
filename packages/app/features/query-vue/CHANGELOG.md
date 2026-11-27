# @molecule/app-query-vue

## 1.4.1

### Patch Changes

- Pass `QueryContent`'s error renderer an `Error`, and type `useQuery`'s `error` as one.

## 1.4.0

### Minor Changes

- Every query binding exports the same names: React adds `useListQuery` with `ListQueryRoute`, `ListQueryState`, `ListQueryInputs` and `ListQuerySource`, and each binding names what `useQuery` takes (`QueryOptionsInput`) and what `QueryContent` renders and passes (`QueryContentSlots`, `QueryContentContext`, `QueryContentErrorContext`) in its own framework's form.
- Add `recordKey` and `getRecordId` to `QueryContent`, as in `@molecule/app-query-react`: a newly opened record remounts its content, and a record action waits for a nonempty ID.

## 1.3.1

### Patch Changes

- Keep collection status tied to the current view and verify collection requests follow path selections.

## 1.3.0

### Minor Changes

- Render a selected collection's empty state as one branch exclusive with loaded content.

## 1.2.1

### Patch Changes

- Examples translate through the framework binding's `useTranslation()`, so a component re-renders when the locale changes.

## 1.2.0

### Minor Changes

- Add `useListQuery`, which observes the page a URL list route points at from reactive inputs.

## 1.1.0

### Minor Changes

- Add `@molecule/app-query-vue`, `@molecule/app-query-solid` and `@molecule/app-query-angular`: the @molecule/app-query bindings (read a cached document, observe it, prefetch on intent) for Vue, Solid and Angular, matching `@molecule/app-query-react`.
