---
'@molecule/app-image-gallery-angular': patch
'@molecule/app-image-gallery-react': patch
'@molecule/app-image-gallery-solid': patch
'@molecule/app-image-gallery-svelte': patch
'@molecule/app-image-gallery-vue': patch
---

Default alt text and the "+N" overflow label now come from i18n instead of fixed English strings, so a locale bond can translate them. The English fallback wording is unchanged.
