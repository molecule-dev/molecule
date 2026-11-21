---
'@molecule/app-locales-common': patch
'@molecule/app-status-summary-angular': patch
'@molecule/app-status-summary-react': patch
'@molecule/app-status-summary-solid': patch
'@molecule/app-status-summary-svelte': patch
'@molecule/app-status-summary-vue': patch
---

Status banners and badges take their colours from the theme's success, warning, error and info tones instead of fixed hex values. The status labels are looked up through literal translation keys, which the common locale bond now provides in every language.
