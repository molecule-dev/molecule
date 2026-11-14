---
'@molecule/app-vue': minor
'@molecule/app-solid': minor
'@molecule/app-svelte': minor
'@molecule/app-angular': minor
---

`useAIModels`, `useAuth`, `useForm`, `useHttp`, `useI18nError`, `useIsActive`, `useOAuth`, `useOptimisticValue`, `usePush`, `useStorageValue`, `useStoragePreference` and `useStore` accept each argument as a plain value or as the framework's reactive source (Vue ref or getter, Solid accessor, Svelte readable store, Angular signal) and follow changes on the same instance, as the React hooks follow a re-render.
