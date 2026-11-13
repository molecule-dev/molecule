# @molecule/app-query-tanstack

## 1.0.5

### Patch Changes

- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 1.0.4

### Patch Changes

- Keep saved documents successful when an older in-flight read is cancelled.

## 1.0.3

### Patch Changes

- Prevent an older in-flight read from overwriting a newer value written with `set()`.

## 1.0.1

### Patch Changes

- 127c4ee: TanStack Query bond for `@molecule/app-query`.
