---
'@molecule/app-contact-form-angular': patch
'@molecule/app-contact-form-react': patch
'@molecule/app-contact-form-solid': patch
'@molecule/app-contact-form-svelte': patch
'@molecule/app-contact-form-vue': patch
'@molecule/app-locales-contact-form': patch
---

The fields' accessible labels and the fallback failure message now come from translation keys instead of fixed English text, so they follow the active locale. The contact-form locale bond adds those keys in every language.
