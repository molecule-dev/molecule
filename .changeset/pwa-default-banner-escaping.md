---
'@molecule/app-pwa-default': patch
---

The service-worker update banner escapes the localized strings it interpolates into its markup, so a `<`, `&` or quote character in a translated string renders as text instead of becoming markup.
