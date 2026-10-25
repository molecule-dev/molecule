---
'@molecule/app-i18n': patch
---

`createSimpleI18nProvider`'s `addTranslations()` notifies `onLocaleChange` subscribers when it changes text for the active locale or for English (the fallback), and stays quiet when nothing changed.
