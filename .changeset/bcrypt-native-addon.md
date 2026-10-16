---
'@molecule/api-password-bcrypt': minor
---

`@molecule/api-password-bcrypt` hashes with the native `bcrypt` addon and falls back to `bcryptjs` on a platform with no usable prebuild. The cost factor is unchanged and both implementations read and write the same `$2b$` hashes, so stored hashes keep working either way. What changes is that a cost-12 hash no longer occupies the event loop for ~100 ms at a time — the addon runs the same computation on a threadpool thread — which is what made concurrent signups take seconds on a single-vCPU deployment. `provider`, plus the new `loadNativeBcrypt()` and `NativeBcrypt`, are exported from the package root.
