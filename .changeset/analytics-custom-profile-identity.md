---
'@molecule/app-analytics': minor
---

Requires `identifyUser` for custom auth profiles without a required string `id`, preserves default client and mergeable option typing, and records sign-in events without a user ID or an identify call when the mapper returns `null` or the default `id` is missing, empty or not a string.
