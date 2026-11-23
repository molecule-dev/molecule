# @molecule/app-react-native

## 4.3.2

### Patch Changes

- The `useForm` docs now say it needs no setup: until the app bonds a forms provider, the built-in one is used.

## 4.3.1

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 4.3.0

### Minor Changes

- Re-export `RoutedView` from `@molecule/app-react`.

## 4.2.0

### Minor Changes

- Re-exports the new `@molecule/app-react` hooks (peer raised to `^4.8.0`); `useSafeArea` resolves `react-native-safe-area-context` once and calls its hook unconditionally.
- Re-exports `SelectingStoreOptions` from `@molecule/app-react`, the options type for a `useStore` call with a selector.

### Patch Changes

- `useAppState` reads `AppState` through `useSyncExternalStore`, so the first render reports the real state (not `'active'`) and a change before the subscription is not missed.

## 4.1.0

### Minor Changes

- Expose useOptimisticToggle through the React Native framework bindings.

## 4.0.1

### Patch Changes

- Export the `SafeAreaInsets` type returned by `useSafeArea`.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0

## 3.0.7

### Patch Changes

- Document access-only session revalidation and the current profile-save lifecycle in framework auth references.

## 3.0.6

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 3.0.5

### Patch Changes

- Refresh generated documentation for optimistic values, queued updates, and server-confirmed state.

## 3.0.4

### Patch Changes

- Declare the peers this package loads on start-up as required instead of optional.

## 3.0.3

### Patch Changes

- The README lists every member of long type declarations and keeps long descriptions whole.

## 3.0.2

### Patch Changes

- Inherit React's late-value fix so unchanged external records cannot undo reset baselines.

## 3.0.1

### Patch Changes

- Clarify pending button interactions and asynchronous action status.

## 3.0.0

### Major Changes

- Accept an ordinary `interface` as a form's values type: every form entrypoint now constrains it to the exported `FormValuesConstraint<T>` instead of `Record<string, unknown>`, while primitives, arrays, functions and `Date` stay rejected. Generic forwarders that name `Record<string, unknown>` or `object` must copy that constraint.

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0

## 2.0.1

### Patch Changes

- 2a74d83: Preserve generic type parameters and explicit types in API documentation.

## 2.0.0

### Patch Changes

- @molecule/app-react@2.0.0

## 1.0.3

### Patch Changes

- 8c20e8d: Clarify custom response envelope handling and account registration examples.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-keyboard@1.0.1
  - @molecule/app-lifecycle@1.0.1
  - @molecule/app-react@1.0.1
