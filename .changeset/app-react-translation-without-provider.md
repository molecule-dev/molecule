---
'@molecule/app-react': minor
---

`useTranslation()`, `useT()`, `useLocale()` and `useDirection()` read the bonded i18n provider when no `I18nProvider` is mounted, instead of throwing.
