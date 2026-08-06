# @molecule/api-uploads-s3

## 1.0.2

### Patch Changes

- bd4167a: Publish the source that molecule-dev already depends on.

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

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-secrets@1.0.1
  - @molecule/api-uploads@1.0.1
