# @molecule/app-react

## 1.4.0

### Minor Changes

- eded2d3: Adds a side-channel send for human-to-human chat messages (e.g. team notes): `ChatProvider.sendSideMessage` (optional, implemented by the HTTP bond on an independent request lifecycle) and a `sideChannel` option on `useChat`'s `sendMessage`. A side-channel message goes out immediately even while a turn is streaming — it never queues behind the active turn, never aborts the live stream, and never disrupts remote-turn tracking. Callers fall back to the normal send path on providers without side-channel support.

## 1.3.1

### Patch Changes

- 77b62e0: Chat broadcasts missed while the push channel was down (e.g. a teammate's note against a backgrounded tab) are reconciled from the persisted transcript when the channel reconnects.

## 1.3.0

### Minor Changes

- 583cd49: Live collaborative chat streaming: pushed broadcast frames from a turn running elsewhere (a teammate's send, another tab) render in real time — text and thinking deltas, tool activity, verification, completion — via the new `useChat.applyRemoteEvent` ingestion path, with a `readOnly` watcher mode for viewers and a progress-preserving history reconcile. Agent-setting changes (model, effort, fast mode, max tool loops, processing region, auto-fix, auto-approve) surface as shared, attributed transcript cards through the new `setting` card kind.

## 1.2.0

### Minor Changes

- d15589c: Add team-only chat messages: `ChatMessage` gains a `teamOnly` flag (a human-only note the model never sees, rendered with author attribution) and the chat stream gains a `{ type: 'message'; message: ChatMessage }` event that appends a complete, non-streaming message to the transcript. The React `useChat` binding handles the new event via `appendCompleteMessage`, with the same id-based dedupe as card messages so a live team note is byte-identical to what history reloads.

## 1.1.1

### Patch Changes

- 8c4c483: useChat: the auto-retry after a 5XX / transport drop now runs up to 8 attempts (5s, 10s, 20s, then 30s holds) so an interrupted turn resumes across a server restart.

## 1.1.0

### Minor Changes

- 49f6145: Adds `useVerifyPaymentReturn`, which confirms a purchase with `POST /users/:id/verify-payment/:provider` after a payment provider redirects back to the app, reading the transaction id a provider left in the query.

## 1.0.3

### Patch Changes

- useChat: re-check stream liveness when the app returns to the foreground, so a chat stream killed by a short screen lock is aborted and resumed within the silence threshold instead of waiting on the stall watchdog.

## 1.0.2

### Patch Changes

- 72d3985: `useChat` now recovers a chat stream interrupted by a screen lock or a backgrounded page, resuming from the server instead of staying silent until the stall watchdog fires.

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
  - @molecule/app-auth@1.0.1
  - @molecule/app-code-editor@1.0.1
  - @molecule/app-device@1.0.1
  - @molecule/app-forms@1.0.1
  - @molecule/app-http@1.0.1
  - @molecule/app-i18n@1.0.1
  - @molecule/app-ide@1.0.1
  - @molecule/app-live-preview@1.0.1
  - @molecule/app-logger@1.0.1
  - @molecule/app-platform@1.0.1
  - @molecule/app-push@1.0.1
  - @molecule/app-routing@1.0.1
  - @molecule/app-state@1.0.1
  - @molecule/app-storage@1.0.1
  - @molecule/app-theme@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-utilities@1.0.1
  - @molecule/app-version@1.0.1
