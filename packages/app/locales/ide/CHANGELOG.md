# @molecule/app-locales-ide

## 1.9.0

### Minor Changes

- Adds the locale keys for the structured ask_user card (multi-select confirm, selected count, preview), the working-plan checklist, the plan-review card, and the subagent card.

## 1.8.0

### Minor Changes

- 8961d63: The `/test` card now names the test on screen while a run is in flight — the runner's own group and title with a live per-file tally — and a running file can be skipped without ending the run; a skipped file reads `Skipped`, never as a pass. The executor's own long-running command gains the same Skip.

## 1.7.0

### Minor Changes

- 6133613: The `/test` card's failed rows gain a "Fix with Synthase" action (and a batch action in the header) that hands the failing file and its runner output to the chat; runner output starts collapsed behind Show/Hide output; every action renders as a filled button, and a design guard test keeps command-card actions from shipping as text links.

## 1.6.0

### Minor Changes

- 20be04f: Adds the Tests bar: an expandable row above the composer that lists the project's end-to-end specs and unit tests and runs them, one at a time or all together, streaming each result inline (hosts provide `listTests`/`runTests`); the locale bond gains the `ide.tests.*` strings.

## 1.5.0

### Minor Changes

- 740234e: Adds translations for the chat's `/timestamps` confirmations.

## 1.4.0

### Minor Changes

- 74d28df: The `/cost` card now names the allowance window the host reports (`allowanceWindow`), so a monthly allowance reads "this month's" rather than "today's", and reset countdowns beyond a day render as "in about N days" instead of "tomorrow".

## 1.3.1

### Patch Changes

- Add the `ide.chat.settings.effort.label` ("Reasoning effort") translation in all 79 languages.

## 1.3.0

### Minor Changes

- 583cd49: Live collaborative chat streaming: pushed broadcast frames from a turn running elsewhere (a teammate's send, another tab) render in real time — text and thinking deltas, tool activity, verification, completion — via the new `useChat.applyRemoteEvent` ingestion path, with a `readOnly` watcher mode for viewers and a progress-preserving history reconcile. Agent-setting changes (model, effort, fast mode, max tool loops, processing region, auto-fix, auto-approve) surface as shared, attributed transcript cards through the new `setting` card kind.

## 1.2.0

### Minor Changes

- d2e73b0: Add `canShare` to ChatPanel and `canManage`/`canCreate`/`canRevoke` to ShareModal so hosts that gate share-link management above the edit role can hide the /share command, header share button, and modal controls instead of surfacing requests the backend rejects; read-only viewers no longer trigger a settings write when their selected model is delisted. The locale bond adds the matching `ide.chat.share.notAllowed` message in all languages.

## 1.1.6

### Patch Changes

- d15589c: ChatPanel gains a `canEdit` prop (default `true`): when `false` — a read-only project viewer — the composer blocks a plain message or write-command with a read-only note (team `/teamsay` and viewer-safe commands still pass), slash commands default-deny unless the command registry flags them `viewerSafe`, the plan/fast mode toggles disable, and a view-only note shows above the composer. `CommandDef` gains a `viewerSafe` flag. The `/model` picker now refreshes when the custom-model catalog changes (editing a BYO provider no longer leaves the old model shown), and a removed custom model re-points to the same provider before a platform fallback. Also renders teammates' human-only team notes (the `message` stream event) and matches side-channel command aliases. app-locales-ide adds the read-only-viewer strings.

## 1.1.5

### Patch Changes

- 5d8f3dd: Share modal now reflects a project's current public link: when one exists it shows the full, absolute URL with click-to-copy and a Revoke control and no longer offers to create another; when none exists it offers create. Adds a reusable `ShareLinkManager` component (export) so a host can render the same UI in its own team/access panel.

## 1.1.4

### Patch Changes

- Add translations for the parameterized `/scripts` panel keys, the chat queued-count label, item render errors, and the peak-hour keys across all supported languages.

## 1.1.3

### Patch Changes

- Add translation keys for the parameterized /scripts panel.

## 1.1.2

### Patch Changes

- Add the `ide.chat.queuedCount` translation key.

## 1.1.1

### Patch Changes

- 8c346c3: Add `ide.chat.itemRenderError`, shown in place of a chat message that could not be rendered, in all 79 languages.

## 1.1.0

### Minor Changes

- The model picker prices models on cache reads — the dominant cost in agentic traffic — instead of list input price alone, and flags models whose region is in a peak-surcharge window.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
