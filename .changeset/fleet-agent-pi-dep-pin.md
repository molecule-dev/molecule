---
'@molecule/api-agent-transcript-autodetect': patch
---

Make the Pi reader an optional dynamic import instead of a dependency: 1.2.0 shipped a hard dependency on `@molecule/api-agent-transcript-pi`, which is not yet published to the public registry, making every registry install of autodetect fail outright (E404 resolving the install graph). The Pi reader now joins `harnessReaders` only when the consuming project ships the bond itself.
