# @molecule/api-ai-xai

## 1.0.2

### Patch Changes

- 199861d: Parse xAI's string-form error bodies (`{ code, error }`) so upstream 400 details are logged instead of a bare "HTTP 400", and surface an attachment-specific message when an image is rejected for size instead of the generic invalid-request text.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-ai@1.0.1
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
