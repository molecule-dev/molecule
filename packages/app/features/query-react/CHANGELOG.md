# @molecule/app-query-react

## 1.8.1

### Patch Changes

- Examples read the router through the framework binding and the routing bond's providers.

## 1.8.0

### Minor Changes

- Let QueryContent mount edit forms for the current query record and reset their drafts when its identity changes.
- Every query binding exports the same names: React adds `useListQuery` with `ListQueryRoute`, `ListQueryState`, `ListQueryInputs` and `ListQuerySource`, and each binding names what `useQuery` takes (`QueryOptionsInput`) and what `QueryContent` renders and passes (`QueryContentSlots`, `QueryContentContext`, `QueryContentErrorContext`) in its own framework's form.
- `useQuery` keeps the options and previous document of the committed render, so a discarded transition render no longer resubscribes the key on screen; it now peers on `@molecule/app-react` 4.8 or later.
- Bind query actions to identified records and reject record writes with missing IDs.

## 1.7.1

### Patch Changes

- Keep collection status tied to the current view and verify collection requests follow path selections.

## 1.7.0

### Minor Changes

- Render a selected collection's empty state as one branch exclusive with loaded content.

## 1.6.2

### Patch Changes

- Examples translate through the framework binding's `useTranslation()`, so a component re-renders when the locale changes.

## 1.6.1

### Patch Changes

- Correct the resource quickstart's JSX and compose loaded-record rendering with queued toggle state. Clarify that resource mutations publish saved detail before list refreshes finish, and that UI readiness and click ordering belong to the control.
- Re-export `createQueryResource` and `prefetchQuery` from `@molecule/app-query` instead of local copies.

## 1.6.0

### Minor Changes

- Render lists and resource actions only when their query data is ready with QueryContent.

## 1.5.0

### Minor Changes

- Remove acknowledged deletions from cached lists immediately and preserve them across stale reads, with typed adapters for page envelopes.

## 1.4.0

### Minor Changes

- Publish custom mutation responses through the query observer's typed setData action.
- Keep paginated collection envelopes, alternate lists and pending reads current after resource mutations with listPage.

### Patch Changes

- Clarify that a superseded fetch promise settles independently of the saved cache document.

## 1.3.0

### Minor Changes

- Provide a typed refetch action that refreshes mounted query data after mutations and retries failed reads.

## 1.2.0

### Minor Changes

- Add `createQueryResource`: list and detail reads as `useQuery` options, and writes that update the shared cache.

## 1.1.6

### Patch Changes

- Clarify how detail pages render data regions and enable actions after their initial document loads.

## 1.1.5

### Patch Changes

- The README lists every member of long type declarations and keeps long descriptions whole.

## 1.1.4

### Patch Changes

- Document that a mutation response written with `set()` cannot be undone by an older in-flight read.

## 1.1.3

### Patch Changes

- Correct query examples to distinguish loading, missing documents and HTTP failures.

## 1.1.2

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.1

### Patch Changes

- Refresh the documented query peer range and Three.js disposal signature.

## 1.1.0

### Minor Changes

- A list keeps its previous page's document while a same-principal page or filter loads, and drops it as soon as the principal changes: `useQuery` accepts `principal` with `keepPreviousData` and reports `isPreviousData`.

## 1.0.3

### Patch Changes

- 51aa3f9: Clarify invalidation, mutation updates, and retries for mounted query consumers.

## 1.0.2

### Patch Changes

- 0998b77: The in-memory bond now aborts a document's in-flight request when its last observer unsubscribes (the page unmounted or changed key), and `useQuery` is documented as the way pages load data.

## 1.0.1

### Patch Changes

- 127c4ee: React hooks for `@molecule/app-query`: `useQuery`, `usePrefetch` and `intentPrefetchProps`.
