---
'@molecule/api-ai-tools': patch
---

Command blocking now also covers reads of `/etc/mol/…` (the molecule platform secrets directory — e.g. `cat /etc/mol/env`, `base64 < /etc/mol/env`), closing an env-dump gap alongside the existing `/proc`/`/etc/environment` rules. Building tools over a LOCAL-HOST backend with `pathGuards`/`symlinkGuards` disabled now logs a loud warning naming the exact gaps; defaults are unchanged.
