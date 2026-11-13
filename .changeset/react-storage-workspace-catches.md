---
'@molecule/app-react': patch
'@molecule/app-locales-react': minor
---

`useStorageValue` ends loading when a write lands before the first read, starts over on a new key, and reads once for an inline object `defaultValue`. `useWorkspace` reads the full state from providers with `getState()`. `usePush`, `useVerifyPaymentReturn` and `useChat` log the failures they used to drop, and `useOAuth` translates its generic failure message (`react.error.oauthFailed`).
