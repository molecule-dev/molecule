---
'@molecule/api-encryption-aes': minor
---

Add authenticated chunked AES-256-GCM stream encryption with a per-stream HKDF subkey and a key id, detecting tampering, reordering, a wrong context, a wrong key and truncation without holding the stream in memory.
