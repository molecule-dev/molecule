---
'@molecule/app-query': patch
'@molecule/app-query-memory': patch
'@molecule/app-query-react': patch
---

The in-memory bond now aborts a document's in-flight request when its last observer unsubscribes (the page unmounted or changed key), and `useQuery` is documented as the way pages load data.
