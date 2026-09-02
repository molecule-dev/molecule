# @molecule/app-ai-chat-http

## 1.1.0

### Minor Changes

- eded2d3: Adds a side-channel send for human-to-human chat messages (e.g. team notes): `ChatProvider.sendSideMessage` (optional, implemented by the HTTP bond on an independent request lifecycle) and a `sideChannel` option on `useChat`'s `sendMessage`. A side-channel message goes out immediately even while a turn is streaming — it never queues behind the active turn, never aborts the live stream, and never disrupts remote-turn tracking. Callers fall back to the normal send path on providers without side-channel support.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-ai-chat@1.0.1
  - @molecule/app-i18n@1.0.1
