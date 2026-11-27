# @molecule/app-query-memory

## 1.2.0

### Minor Changes

- Read `staleTime` and `gcTime`, and report a rejection that is not an `Error` as an `Error` whose `cause` is the rejected value.

## 1.1.1

### Patch Changes

- Requires `@molecule/app-query` 1.3.1 (`normalizeData`) or later, the first release that declares what it uses.

## 1.1.0

### Minor Changes

- Keep resource row lists unique by URL identity when cached mutation responses are inserted again.

## 1.0.5

### Patch Changes

- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 1.0.4

### Patch Changes

- Prevent an older in-flight read from overwriting a newer value written with `set()`.

## 1.0.2

### Patch Changes

- 0998b77: The in-memory bond now aborts a document's in-flight request when its last observer unsubscribes (the page unmounted or changed key), and `useQuery` is documented as the way pages load data.

## 1.0.1

### Patch Changes

- 127c4ee: Dependency-free in-memory bond for `@molecule/app-query`.
