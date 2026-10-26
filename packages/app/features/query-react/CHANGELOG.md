# @molecule/app-query-react

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
