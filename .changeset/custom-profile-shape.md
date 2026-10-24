---
'@molecule/app-auth': major
---

Allow an app's own object profile — including one without `id` — in `AuthClientConfig`,
`createJWTAuthClient`, the bonded client accessors and the bonded `login`/`register`
utilities.

- Name the profile at the call: `createJWTAuthClient<SessionUser>(config)`,
  `getClient<SessionUser>()`, `getUser<SessionUser>()`, `login<SessionUser>()`,
  `register<TExtra, SessionUser>()`. It is never inferred from the config — not from
  `mapAuthResponse`, `profileEndpoint`, `profileRequestBody` or `shouldRestoreUser`, and
  not from an annotated config variable. An untyped call keeps `UserProfile` and its
  required `id: string`.
- A profile must be a JSON object type of named fields: an array, a function and a `Date`
  are rejected at every entrypoint (`AuthProfileConstraint`). `any` is accepted as the
  caller's explicit opt-out.
- `login<T>()` and `register<TExtra, T>()` return `AuthResult<T>`; the registration-extra
  fields stay the first type argument.
- `AuthEvent` and `AuthEventListener` are typed by the profile, and `addEventListener`
  takes one listener type, `AuthEventListener<T>`. An inline listener needs no annotation
  (`client.addEventListener((event) => …)`), and on a client whose profile extends
  `UserProfile` a listener written against the default `AuthEventListener` is still
  accepted. A client whose profile does not extend `UserProfile` (no `id`) accepts only
  `AuthEventListener<T>`.
- `AuthClientConfig<T>` is `AuthClientConfigOptions<T>` plus the profile-shape check; the
  option members' documentation lives on `AuthClientConfigOptions`.

**Migrating from 1.8.** Three caller shapes named the profile implicitly and now name it at
the call:

- a mapper that supplied it —
  `createJWTAuthClient({ mapAuthResponse: (d): AuthResult<MyUser> => … })` — becomes
  `createJWTAuthClient<MyUser>({ mapAuthResponse })`;
- `const config: AuthClientConfig<MyUser> = …; createJWTAuthClient(config)` becomes
  `createJWTAuthClient<MyUser>(config)` when `MyUser` extends `UserProfile` (a no-id profile
  was already rejected by 1.8);
- generic forwarding —
  `function make<T extends UserProfile>(config: AuthClientConfig<T>) { return createJWTAuthClient<T>(config) }`
  — copies the exported constraint: `T extends AuthProfileConstraint<T>`.

**Breaking for `AuthClient` implementers.** A provider that implements the interface must
declare `addEventListener(listener: AuthEventListener<T>): () => void`. The previous
declaration, `addEventListener(listener: AuthEventListener)`, is no longer assignable once
the client's profile is a custom one, because those events do not necessarily carry a
`UserProfile` (`id`).
