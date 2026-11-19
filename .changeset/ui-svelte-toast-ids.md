---
'@molecule/app-ui-svelte': patch
---

Toast ids are unique across every `ToastProvider` on a page, and `useToast().addToast` types each toast prop.
