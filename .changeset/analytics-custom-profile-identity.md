---
'@molecule/app-analytics': patch
---

`setupAutoTracking` accepts an auth client whose profile has no `id`.

The identity recorded for a sign-in now comes from a new `identifyUser` extractor —
`identifyUser: (user) => ({ userId: user.username, email: user.email })`. It is required
when the profile has no `id: string`, so a custom profile cannot be wired with an
undefined `userId`; the default `id`/`email`/`name` extraction and the login, register,
logout and error events are unchanged.
