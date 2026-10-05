---
'@molecule/api-encryption-aes': patch
---

`createProvider` refuses a key version outside the stream header's range and a prior key at the current version; `verify()` answers false instead of throwing for a candidate hash with multi-byte characters; `rotateKey()` takes the next free version (never one a prior key holds) and refuses to run past the stream header's range.
