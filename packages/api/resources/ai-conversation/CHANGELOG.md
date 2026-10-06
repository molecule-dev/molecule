# @molecule/api-resource-ai-conversation

## 1.0.3

### Patch Changes

- 30b2c09: Clearing a chat deletes the conversation named by `?conversationId=` (looked up within the project) instead of whichever conversation the project listed first; with no id and several conversations it answers 400.

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
  - @molecule/api-database@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-locales-ai-conversation@1.0.1
  - @molecule/api-logger@1.0.1
  - @molecule/api-resource@1.0.1
