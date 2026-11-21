---
'@molecule/app-locales-reputation-badge': patch
'@molecule/app-reputation-badge-react': patch
---

Level names are looked up through literal translation keys, with a fallback key that the locale bond adds in every language so a level outside the built-in set still shows its own name. Non-interactive badges in the shelf are exposed to screen readers as labelled images.
