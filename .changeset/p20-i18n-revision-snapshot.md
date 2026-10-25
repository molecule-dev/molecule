---
'@molecule/app-i18n': minor
'@molecule/app-react': patch
---

Add an optional provider revision that lets `useT` and `useTranslation` observe translation changes announced before their listener exists, including from a child's layout effect or while a hidden `<Activity>` tree has its effects unmounted.
