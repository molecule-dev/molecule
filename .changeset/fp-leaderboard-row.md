---
'@molecule/app-leaderboard-row-angular': patch
'@molecule/app-leaderboard-row-react': patch
'@molecule/app-leaderboard-row-solid': patch
'@molecule/app-leaderboard-row-svelte': patch
'@molecule/app-leaderboard-row-vue': patch
---

A row with `onClick` is now a focusable button in the accessibility tree, and Enter or Space activate it. The rank-delta arrow and the current-user highlight take their colours from the theme's success, error and info tones instead of fixed hex values.
