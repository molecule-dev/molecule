---
'@molecule/app-e2e-preview': patch
---

The preview client is injected into compressed HTML responses by decoding and re-encoding the body, so a page served by `vite preview` (Vite 8 compresses HTML) loads instead of failing with `net::ERR_CONTENT_DECODING_FAILED`.
