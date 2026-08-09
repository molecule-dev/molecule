# @molecule/app-ide-react

## 1.0.2

### Patch Changes

- PreviewPanel: wait longer before flagging a preview as blank so a sandbox that is still cold-starting (or served through a preview proxy) is never falsely reported as "didn't render anything". A real render still clears the overlay immediately.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-ai-chat@1.0.1
  - @molecule/app-ai-models@1.0.1
  - @molecule/app-ai-voice@1.0.1
  - @molecule/app-code-editor@1.0.1
  - @molecule/app-country-flags@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-icons@1.0.1
  - @molecule/app-ide@1.0.1
  - @molecule/app-live-preview@1.0.1
  - @molecule/app-logger@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-storage@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
