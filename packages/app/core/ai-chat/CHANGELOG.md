# @molecule/app-ai-chat

## 1.3.0

### Minor Changes

- eded2d3: Adds a side-channel send for human-to-human chat messages (e.g. team notes): `ChatProvider.sendSideMessage` (optional, implemented by the HTTP bond on an independent request lifecycle) and a `sideChannel` option on `useChat`'s `sendMessage`. A side-channel message goes out immediately even while a turn is streaming — it never queues behind the active turn, never aborts the live stream, and never disrupts remote-turn tracking. Callers fall back to the normal send path on providers without side-channel support.

## 1.2.0

### Minor Changes

- 583cd49: Live collaborative chat streaming: pushed broadcast frames from a turn running elsewhere (a teammate's send, another tab) render in real time — text and thinking deltas, tool activity, verification, completion — via the new `useChat.applyRemoteEvent` ingestion path, with a `readOnly` watcher mode for viewers and a progress-preserving history reconcile. Agent-setting changes (model, effort, fast mode, max tool loops, processing region, auto-fix, auto-approve) surface as shared, attributed transcript cards through the new `setting` card kind.

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
