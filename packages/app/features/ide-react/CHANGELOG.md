# @molecule/app-ide-react

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
