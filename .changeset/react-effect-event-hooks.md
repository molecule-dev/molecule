---
'@molecule/app-react': minor
---

Add `useEffectEvent`, `useStableCallback` and `useValueAtKeyChange` under `@molecule/app-react/render`; `useForm`, `useHttp` and `useTranslation` no longer keep values from a render React discards, a locale switch runs a translated component once, and `useStoragePreference`, `useAIModels` and `useEditor` show the new key's, scope's or provider's value in the first render after it changes.
