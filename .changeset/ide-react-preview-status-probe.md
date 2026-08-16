---
'@molecule/app-ide-react': patch
---

`PreviewPanel` now asks the preview host for a CORS-readable status before mounting the app, so an edge's "unavailable" error page is no longer mistaken for a working preview; hosts that do not serve `/__mol/preview-status` keep the previous behaviour.
