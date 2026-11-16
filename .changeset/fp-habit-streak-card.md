---
'@molecule/app-habit-streak-card-angular': patch
'@molecule/app-habit-streak-card-react': patch
'@molecule/app-habit-streak-card-solid': patch
'@molecule/app-habit-streak-card-svelte': patch
'@molecule/app-habit-streak-card-vue': patch
'@molecule/app-locales-habit-streak-card': patch
---

The heatmap strip and its day squares take their accessible labels from the locale bond, which adds the strip label and the `date: count` tooltip in every language. The strip is marked as one group and each square as an image, so screen readers announce them correctly.
