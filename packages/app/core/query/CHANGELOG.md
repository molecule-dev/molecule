# @molecule/app-query

## 1.3.3

### Patch Changes

- Bind query actions to identified records and reject record writes with missing IDs.

## 1.3.2

### Patch Changes

- Query options for one document type are assignable to options for a union of document types again; `normalizeData` no longer fixes them to one exact type.
- Document complete custom-account saves and live query mutations, with lifecycle regression coverage.

## 1.3.1

### Patch Changes

- Document existing resource toggle direction and complete action labels with persistence regressions.

## 1.3.0

### Minor Changes

- Keep resource row lists unique by URL identity when cached mutation responses are inserted again.

## 1.2.0

### Minor Changes

- Add `createQueryResource` (list and detail query options plus cache-writing mutations over the bonded client) and `prefetchQuery`, so every framework binding shares one implementation.

## 1.1.3

### Patch Changes

- Require a principal in the query type when retaining previous data, so missing viewer identity fails before rendering.
- Clarify that a superseded fetch promise settles independently of the saved cache document.

## 1.1.2

### Patch Changes

- Document that `set()` supersedes an older in-flight read for the same key.

## 1.1.1

### Patch Changes

- Correct query examples to distinguish loading, missing documents and HTTP failures.

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

- 127c4ee: Client-side query cache core: fetch once, read synchronously, prefetch ahead of navigation, observe changes; the cache engine is a bond.
