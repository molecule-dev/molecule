---
'@molecule/app-bonds-default-react': patch
---

Accept a custom object profile without `id` in `createDefaultAuthClient`,
`createDefaultAuthClientWithHttpSync` and `createDefaultAuthClientWithFetchClient`.

The profile is named at the call (`createDefaultAuthClient<SessionUser>(config)`); it is
never inferred from the config, so an untyped call keeps `UserProfile` and its required
`id: string`. Array, function and `Date` profiles are rejected, matching
`@molecule/app-auth`'s `AuthProfileShape`.
