---
'@molecule/app-react': minor
---

Create form controllers through the bonded forms provider by default, so `useForm({ defaultValues })` works without passing `createForm`; an explicit factory still overrides it.
