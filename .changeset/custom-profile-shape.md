---
'@molecule/app-auth': patch
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
- `AuthEvent` and `AuthEventListener` are typed by the profile. An implementation that
  types its listener as `AuthEventListener` keeps compiling while the client's profile
  extends `UserProfile`, and a client whose profile does not extend `UserProfile` requires
  `AuthEventListener<T>` — annotate an inline listener there (`(event: AuthEvent<T>) => …`).
- `AuthClientConfig<T>` is `AuthClientConfigOptions<T>` plus the profile-shape check; the
  option members' documentation lives on `AuthClientConfigOptions`.
