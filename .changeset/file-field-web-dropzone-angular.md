---
'@molecule/app-file-dropzone-angular': patch
---

A `maxSize` of 0 now rejects any nonempty file, a click opens the chooser once, the same file can be chosen again, and `accept` matches MIME types in any case. Requires `@molecule/app-filesystem` 1.1.0 or later.
