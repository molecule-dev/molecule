# @molecule/app-ai-chat

## 1.1.0

### Minor Changes

- d15589c: Add team-only chat messages: `ChatMessage` gains a `teamOnly` flag (a human-only note the model never sees, rendered with author attribution) and the chat stream gains a `{ type: 'message'; message: ChatMessage }` event that appends a complete, non-streaming message to the transcript. The React `useChat` binding handles the new event via `appendCompleteMessage`, with the same id-based dedupe as card messages so a live team note is byte-identical to what history reloads.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-bond@1.0.1
  - @molecule/app-i18n@1.0.1
