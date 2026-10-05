---
'@molecule/api-encryption-aes': patch
---

`createProvider` refuses a key version outside the stream header's range and a prior key at the current version; `verify()` answers false instead of throwing for a candidate hash with multi-byte characters.
