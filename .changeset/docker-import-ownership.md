---
'@molecule/api-code-sandbox-docker': patch
---

An imported tree is now owned by the sandbox's own user. Docker's putArchive preserves the tar's uid/gid (0) while the sandbox runs as the image's `USER`, so an unrepaired import left the executor unable to write files it had just received — npm install could not touch `node_modules` and Vite could not create its temp config, so the dev server never started. A caller cannot fix this afterwards: an ordinary exec runs as that same non-root user and `chown` is refused.
