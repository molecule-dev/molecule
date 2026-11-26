---
'@molecule/app-file-dropzone-vue': patch
---

A `maxSize` of 0 now rejects any nonempty file, and choosing the same file again delivers it again. Requires `@molecule/app-filesystem` 1.1.0 or later.
