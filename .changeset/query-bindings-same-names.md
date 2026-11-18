---
'@molecule/app-query-react': minor
'@molecule/app-query-vue': minor
'@molecule/app-query-solid': minor
'@molecule/app-query-svelte': minor
'@molecule/app-query-angular': minor
---

Every query binding exports the same names: React adds `useListQuery` with `ListQueryRoute`, `ListQueryState`, `ListQueryInputs` and `ListQuerySource`, and each binding names what `useQuery` takes (`QueryOptionsInput`) and what `QueryContent` renders and passes (`QueryContentSlots`, `QueryContentContext`, `QueryContentErrorContext`) in its own framework's form.
