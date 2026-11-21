---
'@molecule/app-feature-audio-effects-rack-react': patch
'@molecule/app-locales-feature-audio-effects-rack': patch
---

Effect kind and parameter labels are now looked up by literal translation keys, with one fallback label for parameters outside the built-in effect schemas. The locale bond adds that fallback label in every language.
