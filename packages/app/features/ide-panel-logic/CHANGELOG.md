# @molecule/app-ide-panel-logic

## 1.2.0

### Minor Changes

- The tests bar's and tests card's labels (`runningLabel`, `testsBarLabel`, `testsChipLabel`) are exported from `@molecule/app-ide-panel-logic/panels`, so every framework's IDE shows the same text.

## 1.1.0

### Minor Changes

- Add `@molecule/app-ide-panel-logic`, the framework-neutral logic of the IDE panels (slash commands, settings, chat utilities, the chat card style, custom event cards, shortcut matching, panel types), which `@molecule/app-ide-react` re-exports. `useKeyboardShortcuts` now fires an `allowInEditor` shortcut inside the Monaco editor, `ChatTimestamp` re-formats on a locale switch, and `findKeyboardShortcut` and `isShortcutBlockedByFocus` are new exports.

### Patch Changes

- The plan-review card says when approving the plan publishes the app and runs its test suite on the live app.
