---
'@molecule/app-react': patch
---

`useOAuth` and `useVerifyPaymentReturn` no longer call their callbacks or rewrite the URL after the component unmounts; the session and profile still update.
