---
'@molecule/app-auth': major
---

Allow an app's own object profile — including one without `id` — in `AuthClientConfig`,
`createJWTAuthClient`, the bonded client accessors and the bonded `login`/`register`
utilities.

- The profile is named where the client is created (`createJWTAuthClient<SessionUser>`) or
  on a config the caller annotated. It is never inferred from `mapAuthResponse`, so an
  untyped call keeps `UserProfile` and its required `id: string`.
- A profile must be a JSON object type of named fields: an array, a function and a `Date`
  are rejected at every entrypoint (`AuthProfileShape`), because the client persists the
  profile with `JSON.stringify`/`JSON.parse` and patches it field-wise.
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

**Breaking for `AuthClient` implementers.** A provider that implements the interface must
declare `addEventListener(listener: AuthEventListener<T>): () => void`. The previous
declaration, `addEventListener(listener: AuthEventListener)`, is no longer assignable once
the client's profile is a custom one, because those events do not necessarily carry a
`UserProfile` (`id`). Callers of the client are unaffected.
