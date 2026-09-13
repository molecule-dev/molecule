---
'@molecule/app-react': patch
---

`useTheme()` hydrates with the provider's server theme and switches to the live one after, so a persisted or OS-preferred theme no longer causes a hydration mismatch on prerendered pages.
