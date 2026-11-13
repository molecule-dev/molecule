# @molecule/app-angular

## 3.3.0

### Minor Changes

- Adds `useChat`, `useChatProvider`, `convergeHistory`, `localOnlyMessages`, `resetChatStoresForTests` and the agent identity defaults with React's behavior, backed by the shared chat session of `@molecule/app-ai-chat` (now a required peer, as is `@molecule/app-ai-models`); `useChat` accepts reactive options, and the composition root takes a `chat` provider.

### Patch Changes

- `provideMolecule({ i18n })` now stops listening for locale changes when the app is destroyed.

## 3.2.4

### Patch Changes

- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 3.2.3

### Patch Changes

- Document access-only session revalidation and the current profile-save lifecycle in framework auth references.

## 3.2.2

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 3.2.1

### Patch Changes

- The README lists every member of long type declarations and keeps long descriptions whole.

## 3.2.0

### Minor Changes

- Add an optional bootstrap hold while the initial auth session status is loading.

## 3.1.0

### Minor Changes

- Deliver late records through explicit `updateValues()` options instead of ignored reactive creation options.

## 3.0.0

### Major Changes

- Accept an ordinary `interface` as a form's values type: every form entrypoint now constrains it to the exported `FormValuesConstraint<T>` instead of `Record<string, unknown>`, while primitives, arrays, functions and `Date` stay rejected. Generic forwarders that name `Record<string, unknown>` or `object` must copy that constraint.

### Patch Changes

- Updated dependencies
  - @molecule/app-forms@2.0.0

## 2.0.1

### Patch Changes

- 2a74d83: Preserve generic type parameters and explicit types in API documentation.

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-auth@3.0.0

## 1.0.5

### Patch Changes

- Accept `@molecule/app-auth` 2.x alongside 1.x. The auth types this package reads are
  unchanged across both majors.

## 1.0.3

### Patch Changes

- b8dd395: Framework auth bindings accept the app's own registration fields (`useAuth<MyUser, CustomRegister>()`, `createAuth<…>`, `createAuthStores<…>`, `MoleculeAuthService<…>` — a type alias or an interface), typing `register()` like the auth client's.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth@1.0.1
  - @molecule/app-device@1.0.1
  - @molecule/app-forms@1.0.1
  - @molecule/app-http@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-logger@1.0.1
  - @molecule/app-platform@1.0.1
  - @molecule/app-push@1.0.1
  - @molecule/app-routing@1.0.1
  - @molecule/app-state@1.0.1
  - @molecule/app-storage@1.0.1
  - @molecule/app-theme@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-utilities@1.0.1
  - @molecule/app-version@1.0.1
