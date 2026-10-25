---
'@molecule/app-react': minor
---

`useT()` re-renders on locale changes while keeping one stable function identity, and accepts an inline fallback as its second argument (`t('key', 'English text')`); `useT()` and `useTranslation()` no longer miss a locale switch or new translations from another component's mount effect.
