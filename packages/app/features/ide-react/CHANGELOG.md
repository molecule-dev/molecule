# @molecule/app-ide-react

## 1.0.4

### Patch Changes

- ChatPanel: on mount, scroll to the latest message after layout settles. The panel remounts on the boot→IDE transition starting at the top, so the live response spinner sat below the fold until the user scrolled (mobile). Now it lands at the bottom once the transition finishes.

## 1.0.3

### Patch Changes

- ChatPanel: keep the conversation pinned to the latest message when the chat container is resized (layout change, on-screen keyboard, orientation), not only when a new message arrives — so the live response never ends up scrolled out of view. Respects a deliberate scroll-up.

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
