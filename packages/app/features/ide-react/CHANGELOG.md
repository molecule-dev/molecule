# @molecule/app-ide-react

## 1.10.1

### Patch Changes

- The command menu now dedupes by id, so a host-provided command with the same id as a shared one replaces it instead of listing twice.

## 1.10.0

### Minor Changes

- f1c7b25: Adds an optional `onRestartBackend` escalation hook to the preview panel: when the backing server answers probes but the app has not confirmed a render for minutes and an automatic reload was already tried, the panel asks the host to restart the backing dev server — at most once per broken episode, with a long cooldown, never during a build. This recovers failure classes a document reload cannot (e.g. module failures cached against the dev server's immutable versioned URLs). Hosts that omit the prop are unaffected.

### Patch Changes

- 1491a42: Peak-hour pricing windows can be restricted to certain UTC weekdays (`peakPricing.windows[].daysOfWeekUtc`), and the DeepSeek entries now carry the Monday-through-Friday qualifier their rate card publishes, so weekend hours inside those windows no longer meter at the peak multiplier. The `/models` picker labels a weekday-only window with the days it applies on.
- 4917f72: The preview panel now recovers on its own after its server comes back: while the "can't load here" or "preview is blank" notice is showing, it keeps probing the preview URL and reloads automatically once the app is serving again (for example after a slow sandbox wake), instead of waiting for a manual reload.
- 8848b7f: The preview's stuck-load recovery no longer reloads a heartbeating document: the inline bridge heartbeats from HTML-parse time, so liveness means the module graph is still loading — reloading it aborted every in-flight module fetch and could trap large apps (slow module graphs behind a proxy) in a permanent reload-and-blank loop. Recovery still fires for a genuinely dead document.
- 9ef4dad: The preview's first-load spinner can no longer sit forever without a way out: if the preview server hasn't answered after 45 seconds, the panel shows the reload / open-in-new-tab notice while it keeps polling (mounting and clearing the notice by itself when the server appears), and the 30-second stuck backstop now re-checks after wake/build holds instead of disarming permanently.
- f90da75: Viewers watching a teammate's turn now see the normal streaming activity indicator; previously the chat activity slot showed "Waiting for the development environment to finish starting…" for the whole remote turn even when the environment was already running.
- eded2d3: Team notes (/teamsay) now send immediately even while a response is streaming, instead of silently queuing until the turn ends; and read-only viewers no longer arm the auto-commit countdown, which fired /commit on their behalf and surfaced a spurious "view-only access, so this command is unavailable" notice.
- 8185523: Read-only viewers no longer auto-send the initial prompt on mount (a stale project-keyed prompt could start a turn the server rejects) and the auto-fix countdown can never dispatch a fix turn from a viewer's client.

## 1.9.1

### Patch Changes

- ba8f87b: The context-usage ring's mount-time restore retries transient failures instead of silently losing the ring for the whole session.
- `/effort` now opens a selectable level picker (like `/model`): bare `/effort` lists the target mode's model-native levels with current/default indicators, live typing filter, a mode selector, and keyboard navigation. `/effort ?` keeps the textual status view; `/effort <level>` still sets directly.
- 16559e0: The preview freeze watchdog is visibility-aware: a hidden tab's throttled timers no longer read as an 18–58s "app stopped responding" freeze (banner + alert once per throttle wake, ~every minute, for as long as the tab stayed backgrounded). Checks pause while hidden and re-baseline on return to the foreground.

## 1.9.0

### Minor Changes

- 625b824: `ShareLinkManager` accepts a `refreshSignal` prop so a host's live-update channel can reload the link list in place, and the ChatPanel's settings re-read signal now refreshes the full agent-behavior bag (per-mode models, effort, regions, max tool loops, auto-fix, auto-approve) — so pickers and toggles reflect changes another collaborator just made instead of holding stale values.

## 1.8.0

### Minor Changes

- 583cd49: Live collaborative chat streaming: pushed broadcast frames from a turn running elsewhere (a teammate's send, another tab) render in real time — text and thinking deltas, tool activity, verification, completion — via the new `useChat.applyRemoteEvent` ingestion path, with a `readOnly` watcher mode for viewers and a progress-preserving history reconcile. Agent-setting changes (model, effort, fast mode, max tool loops, processing region, auto-fix, auto-approve) surface as shared, attributed transcript cards through the new `setting` card kind.

## 1.7.0

### Minor Changes

- d2e73b0: Add `canShare` to ChatPanel and `canManage`/`canCreate`/`canRevoke` to ShareModal so hosts that gate share-link management above the edit role can hide the /share command, header share button, and modal controls instead of surfacing requests the backend rejects; read-only viewers no longer trigger a settings write when their selected model is delisted. The locale bond adds the matching `ide.chat.share.notAllowed` message in all languages.

## 1.6.0

### Minor Changes

- d15589c: ChatPanel gains a `canEdit` prop (default `true`): when `false` — a read-only project viewer — the composer blocks a plain message or write-command with a read-only note (team `/teamsay` and viewer-safe commands still pass), slash commands default-deny unless the command registry flags them `viewerSafe`, the plan/fast mode toggles disable, and a view-only note shows above the composer. `CommandDef` gains a `viewerSafe` flag. The `/model` picker now refreshes when the custom-model catalog changes (editing a BYO provider no longer leaves the old model shown), and a removed custom model re-points to the same provider before a platform fallback. Also renders teammates' human-only team notes (the `message` stream event) and matches side-channel command aliases. app-locales-ide adds the read-only-viewer strings.

## 1.5.0

### Minor Changes

- 5d8f3dd: Share modal now reflects a project's current public link: when one exists it shows the full, absolute URL with click-to-copy and a Revoke control and no longer offers to create another; when none exists it offers create. Adds a reusable `ShareLinkManager` component (export) so a host can render the same UI in its own team/access panel.

## 1.4.0

### Minor Changes

- b5dfe6b: Add an `extraCommands` prop to `ChatPanel` so a host can merge its own slash commands into the command menu, `/help`, and the keyboard dispatcher alongside the shared registry. Selecting one fills the input with `/<id> ` for the host's own handler to run; ids must not collide with a built-in command.

## 1.3.4

### Patch Changes

- Parameterized scripts and built-in commands in the /scripts panel, plus ShareModal copy-button alignment.

## 1.3.3

### Patch Changes

- Anchor queued chat messages above the composer with compact rows.

## 1.3.2

### Patch Changes

- c90b25b: ChatPanel: drop a `requiresSignup` limit banner once `isAnonymous` is `false`, so a viewer who signs in mid-session no longer sees the guest-tier limit and its dead-end sign-up buttons.

## 1.3.1

### Patch Changes

- 8c4c483: PreviewPanel: the steady-state health probe now allows 5s and requires two consecutive misses before treating the app as down, so a preview behind a remote edge is no longer reloaded on a single slow probe.

## 1.3.0

### Minor Changes

- be78cca: Custom chat cards can declare `coversLimitType`, and ChatPanel then hides such a card while its limit banner is stating the same limit, so one limit is never shown twice.

## 1.2.6

### Patch Changes

- 6d3a546: `PreviewPanel` now asks the preview host for a CORS-readable status before mounting the app, so an edge's "unavailable" error page is no longer mistaken for a working preview; hosts that do not serve `/__mol/preview-status` keep the previous behaviour.
- 01e02be: `ShareModal` offers only the roles the host actually grants, via a new `roles` prop that defaults to `['viewer']` — a public link is an unauthenticated credential, so write access through one is opt-in. The role `<select>` renders only when there is a real choice; with one role the dialog states what the link will grant.

## 1.2.5

### Patch Changes

- 03280cc: ask_user option recovery prefers whichever JSON parse yields a recognized text key: a mangled option whose stray escapes make it parse into a label-less object now recovers its label via the collapsed-escape re-parse instead of rendering raw JSON.

## 1.2.4

### Patch Changes

- 4e3bf06: ask_user option recovery also handles mangled pseudo-JSON with mixed escaping (a failed parse retries with collapsed escapes, then falls back to extracting the label key), so a weak model's malformed option payloads still render as readable labels.

## 1.2.3

### Patch Changes

- cbc3247: ask_user cards now unwrap option objects the model pre-serialized as JSON strings (e.g. `'{"key": "x", "label": "Build a new app"}'`) and render the label text, matching the existing object-option normalization.

## 1.2.2

### Patch Changes

- 72d3985: A preview UI command posted while the preview iframe is reloading is now re-sent as soon as the iframe reports back, so preview tools no longer time out in a hidden tab.

## 1.2.1

### Patch Changes

- 8c346c3: Tool cards no longer render raw tool input. A model-supplied field of the wrong type — for example an `ask_user` option sent as `{ label }` instead of a string — is coerced to its text rather than reaching JSX, and each chat timeline item renders inside its own error boundary so one unrenderable item cannot blank the chat. `ChatPanel` accepts `onRenderError` to report a caught item error to the host.

## 1.2.0

### Minor Changes

- The model picker prices models on cache reads — the dominant cost in agentic traffic — instead of list input price alone, and flags models whose region is in a peak-surcharge window.

## 1.1.2

### Patch Changes

- Mode surfaces now show the model that mode actually uses, and pending sends always carry the `automatic` flag — including kickoffs that were suppressed while a send was in flight.

## 1.1.1

### Patch Changes

- 1f01d1f: Add `UIClassMap.touchTargetCompact` — a 36px coarse-pointer hit-area floor for inline CTAs in dense surfaces (banner/chat-card actions) where the full 44px `touchTarget` is visually heavy; chat notice-card actions with a semantic `color` now use it.

## 1.1.0

### Minor Changes

- b0c821a: Chat notice-card actions accept an optional semantic `color` (`ChatEventCardAction.color`); colored actions render as standard ClassMap `cm.button` buttons so CTAs match the host app's other buttons.

## 1.0.5

### Patch Changes

- ChatPanel: derive stick-to-bottom from the scroll position on the actual scroll event, not from touch direction. A streaming burst grows the content without firing a scroll event, so it can no longer be mistaken for the user scrolling up; the auto-pin keeps the live response in view while a deliberate scroll up (and back) still works. Replaces a touch handler that latched "scrolled up" on any downward drag.

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
