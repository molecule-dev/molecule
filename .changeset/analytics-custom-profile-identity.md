---
'@molecule/app-analytics': minor
---

`setupAutoTracking` accepts an auth client whose profile has no `id`.

The identity recorded for a sign-in comes from `identifyUser` —
`identifyUser: (user) => ({ userId: user.username, email: user.email })` — which is
required when the profile has no `id: string`, so a custom profile cannot be wired with an
undefined `userId`. Returning `null` from `identifyUser` skips the `identify` call and
still tracks `auth.login`/`auth.register`, without a `userId`. The default
`id`/`email`/`name` extraction and the login, register, logout and error events are
unchanged, and the documented inline `setupAutoTracking({ authClient: getClient() })`
keeps compiling. `AutoTrackingOptions` stays an interface, so
`declare module '@molecule/app-analytics' { interface AutoTrackingOptions { … } }` keeps
merging; the "required when there is no `id`" rule is applied by `setupAutoTracking`'s
parameter.
