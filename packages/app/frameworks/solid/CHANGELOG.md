# @molecule/app-solid

## 3.18.1

### Patch Changes

- Uses the dedicated feature imports from the framework binding.

## 3.18.0

### Minor Changes

- Adds dedicated imports for chat, AI models and push, with deprecated root aliases.

## 3.17.0

### Minor Changes

- Add a locale-reactive `useRichTranslation` primitive for rich catalog messages.

## 3.16.0

### Minor Changes

- External links render without a router, and `useLinkRouter` provides the router for a destination.

## 3.15.0

### Minor Changes

- Adds `resolveNode`, which reads each function item of a node prop in a scope of its own, and the `LazyNode`, `NodeItems` and `WithNodes` prop types; `PresentWhileNode` runs its callback untracked.

## 3.14.0

### Minor Changes

- Add `ResolveNode`, `PresentWhileNode` and `createNodePresence`, so a node prop is created once where it renders and only while it is shown.

## 3.13.0

### Minor Changes

- Add `rendersNode(node)`: whether a resolved node renders anything, by the rule React's `slot(node)` uses.

## 3.12.0

### Minor Changes

- Add `BodyPortal`, which renders its children in `document.body` (or a given target) exactly as React's `createPortal` does, without moving any node Solid placed.

## 3.11.0

### Minor Changes

- Declares each routing bond as an optional peer from the first version that gives this binding its router, so npm refuses an older bond instead of installing one whose router never mounts.

### Patch Changes

- The router errors also say when the app's routing bond is older than the binding, and how to update it.

## 3.10.0

### Minor Changes

- Add `RoutedView` and the router provider's `routedView` option for routing bonds; routing hooks show a new location with its params and query in the same update, and a missing router names the routing bond to mount.

## 3.9.0

### Minor Changes

- `MoleculeProvider` takes `@molecule/app-react`'s flat props and waits for the session by default when given `auth` (pass `awaitSession: false` to opt out; `config={…}` still works and is deprecated), and adds React's per-service provider components (`StateProvider`, `ThemeProvider`, `HttpProvider`, …) and the `UseDeviceResult`, `UseRouterResult` and `UseVersionResult` types.

## 3.8.0

### Minor Changes

- Add `AuthProvider`; the forms, theme, i18n, state and promise primitives behave as `@molecule/app-react`'s hooks do.

### Patch Changes

- `Link` writes the `href` the router writes for an app path, so a middle-click, a new tab or a copied link under a base path or a hash history opens the page a click opens.

## 3.7.2

### Patch Changes

- `useAIModels` returns one empty `models` list, shared by every caller, while the catalog loads or after a failed fetch.
- `useAIModels` returns the same empty `models` list while the catalog loads or after a failed fetch, so its identity changes only with the catalog.
- Render cached sessions and signed-out pages on the first session read.

## 3.7.1

### Patch Changes

- Clarify that cached JWT tokens and user profiles restore synchronously without a request. Only token-only and cookie-only sessions need an asynchronous current-user request before their first session decision.
- Keep earlier loaded fields when a form receives independent field fills. Preserve unchanged dirty-field validation state and discard the previous draft when a record id changes.

## 3.7.0

### Minor Changes

- Add useOptimisticToggle for server-backed boolean controls with custom markup and queued, argument-free toggles.

## 3.6.0

### Minor Changes

- Add `Link` (Angular: the `<a molLink>` directive), an in-app anchor that navigates through the molecule router with react-router `<Link>`'s click rules.
- `useAIModels`, `useAuth`, `useForm`, `useHttp`, `useI18nError`, `useIsActive`, `useOAuth`, `useOptimisticValue`, `usePush`, `useStorageValue`, `useStoragePreference` and `useStore` accept each argument as a plain value or as the framework's reactive source (Vue ref or getter, Solid accessor, Svelte readable store, Angular signal) and follow changes on the same instance, as the React hooks follow a re-render.

## 3.5.0

### Minor Changes

- Add `useListRoute` (URL-backed pagination, filters and views, with a sign-in redirect for protected views) and `useConsumedSearchParam` (takes a one-time credential such as a reset token out of the URL), with the same options and results in every binding.

## 3.4.0

### Minor Changes

- Every hook, composable, store and service of `@molecule/app-react` now has a counterpart with the same name, options, results and errors, so an app can swap its framework binding without changing what it calls.

## 3.3.0

### Minor Changes

- Adds `useChat`, `useChatProvider`, `convergeHistory`, `localOnlyMessages`, `resetChatStoresForTests` and the agent identity defaults with React's behavior, backed by the shared chat session of `@molecule/app-ai-chat` (now a required peer, as is `@molecule/app-ai-models`); `useChat` accepts reactive options, and the composition root takes a `chat` provider.

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

- Add an optional session render hold and fallback to MoleculeProvider, with a SessionReady component.

## 3.1.0

### Minor Changes

- Publish reactive late values delivered before Solid's first subscription effect.

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

## 1.0.6

### Patch Changes

- Accept `@molecule/app-auth` 2.x alongside 1.x. The auth types this package reads are
  unchanged across both majors.

## 1.0.4

### Patch Changes

- b8dd395: Framework auth bindings accept the app's own registration fields (`useAuth<MyUser, CustomRegister>()`, `createAuth<…>`, `createAuthStores<…>`, `MoleculeAuthService<…>` — a type alias or an interface), typing `register()` like the auth client's.

## 1.0.3

### Patch Changes

- 7857fd8: Dependencies updated: both bindings are now tested against solid-js 1.9.17, which resolves the patched seroval 1.6.x.

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
