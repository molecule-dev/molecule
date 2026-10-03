---
'@molecule/api-resource-user': patch
---

OAuth account creation now claims the provider handle as the username (`vialoh` from GitHub's `vialoh@github`) instead of flattening it into `vialohgithub`; collisions append re-checked numeric then id-based suffixes.
