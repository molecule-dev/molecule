---
'@molecule/app-bonds-default-react': major
---

Accept a custom object profile without `id` in `createDefaultAuthClient`,
`createDefaultAuthClientWithHttpSync` and `createDefaultAuthClientWithFetchClient`, and
require `@molecule/app-auth` 2.x.

Name the profile at the call (`createDefaultAuthClient<SessionUser>(config)`); it is never
inferred from `authConfig` — not from a callback member (`shouldRestoreUser`,
`profileEndpoint`, `profileRequestBody`) and not from an annotated config variable whose
profile extends `UserProfile`. An untyped call keeps `UserProfile` and its required
`id: string`.

Migrate a call that relied on the config's annotation or a callback parameter by naming
the type at the call; migrate generic forwarding with
`T extends AuthProfileConstraint<T>` (exported by `@molecule/app-auth`). This package
imports types added in `@molecule/app-auth` 2.0, so its peer range moves to `^2.0.0` and
1.x is not supported.
