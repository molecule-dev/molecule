---
'@molecule/api-code-sandbox': patch
'@molecule/api-code-sandbox-docker': patch
'@molecule/api-code-sandbox-flyio': patch
'@molecule/api-uploads-s3': patch
'@molecule/api-resource-ai-models': patch
---

Publish the source that molecule-dev already depends on.

These packages' sources moved past their published 1.0.1, and molecule-dev's
API uses the additions — `SandboxConfig.templateId`, `HibernationOutcome`,
`Sandbox.exportFiles`/`importFiles`, `SandboxProvider.find`. None of those
exist in any published version.

npm-workspace symlinks hid it completely: the API resolves `@molecule/*` to
local source, so it has never once compiled against a published package. The
gap only surfaces when something installs from the registry — swapping the
production image's fleet build for `npm install` produced 102 type errors,
all of this shape.

Two things follow. Users installing these at 1.0.1 get a materially older API
than the platform itself runs against. And `Dockerfile.api` must recompile all
915 packages on every deploy to reconstruct types the registry should serve —
~20 minutes of CI per deploy, and the reason it cannot simply install them.

Publishing closes both.
