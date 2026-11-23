# @molecule/app-ide-panel-logic

## 1.4.1

### Patch Changes

- `chatCardStyle` takes the border's accent percentage, so a card can deepen its whole border on hover.

## 1.4.0

### Minor Changes

- Adds the chat panel's timeline, composer, dictation, tests, undo, stream, card-event, formatting and context-usage history logic, so every framework's chat panel runs the same rules.

## 1.3.1

### Patch Changes

- `autoCommitReducer` returns the same state for a `tick` at zero, so a countdown that keeps ticking there causes no re-render.

## 1.3.0

### Minor Changes

- Run the preview panel's behaviour from @molecule/app-ide-panel-logic so every framework's IDE shares it, export the command, setting and share label helpers, and fix chat panel, accessibility and translation details.

### Patch Changes

- The preview's loading overlay now fades out when the app appears instead of being removed and shown again, and the chat header's new-conversation button has a `data-mol-id`.

## 1.2.0

### Minor Changes

- The tests bar's and tests card's labels (`runningLabel`, `testsBarLabel`, `testsChipLabel`) are exported from `@molecule/app-ide-panel-logic/panels`, so every framework's IDE shows the same text.

## 1.1.0

### Minor Changes

- Add `@molecule/app-ide-panel-logic`, the framework-neutral logic of the IDE panels (slash commands, settings, chat utilities, the chat card style, custom event cards, shortcut matching, panel types), which `@molecule/app-ide-react` re-exports. `useKeyboardShortcuts` now fires an `allowInEditor` shortcut inside the Monaco editor, `ChatTimestamp` re-formats on a locale switch, and `findKeyboardShortcut` and `isShortcutBlockedByFocus` are new exports.

### Patch Changes

- The plan-review card says when approving the plan publishes the app and runs its test suite on the live app.
