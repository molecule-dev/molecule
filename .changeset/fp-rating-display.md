---
'@molecule/app-rating-display-angular': patch
'@molecule/app-rating-display-react': patch
'@molecule/app-rating-display-solid': patch
'@molecule/app-rating-display-svelte': patch
'@molecule/app-rating-display-vue': patch
---

Accessible labels are translated through `useTranslation()` and follow a locale switch: the rating label and, in interactive mode, each star's "Rate N of M" button label. The stars now sit in a labelled group, so the rate buttons keep their pressed state for assistive technology instead of being hidden under an image role.
