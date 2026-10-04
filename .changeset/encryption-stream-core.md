---
'@molecule/api-encryption': minor
---

Add optional `encryptStream()`/`decryptStream()` to `EncryptionProvider`, the shared `mol-aead-chunked-v2` stream format, `EncryptionStreamError` with a `code` that separates damaged ciphertext from a wrong key or a truncated stream, `isEncryptionStreamError()` and `hasStreamEncryption()`.
