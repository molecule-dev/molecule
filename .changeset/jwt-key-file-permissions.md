---
'@molecule/api-jwt': patch
---

Generated JWT private-key PEM files are now written with owner-only permissions (`0o600`, directory `0o700`), and the legacy-location migration chmods the copied private key down as well.
