# @molecule/app-query

## 1.0.2

### Patch Changes

- 0998b77: The in-memory bond now aborts a document's in-flight request when its last observer unsubscribes (the page unmounted or changed key), and `useQuery` is documented as the way pages load data.

## 1.0.1

### Patch Changes

- 127c4ee: Client-side query cache core: fetch once, read synchronously, prefetch ahead of navigation, observe changes; the cache engine is a bond.
