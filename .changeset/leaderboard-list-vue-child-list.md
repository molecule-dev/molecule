---
'@molecule/app-leaderboard-list-vue': patch
---

The leaderboard list counts its default slot the way React counts children, so an empty `v-for` renders the empty state.
