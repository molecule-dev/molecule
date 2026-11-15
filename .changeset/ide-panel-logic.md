---
'@molecule/app-ide-panel-logic': minor
'@molecule/app-ide-react': minor
---

Add `@molecule/app-ide-panel-logic`, the framework-neutral logic of the IDE panels (slash commands, settings, chat utilities, the chat card style, custom event cards, shortcut matching, panel types), which `@molecule/app-ide-react` re-exports. `useKeyboardShortcuts` now fires an `allowInEditor` shortcut inside the Monaco editor, `ChatTimestamp` re-formats on a locale switch, and `findKeyboardShortcut` and `isShortcutBlockedByFocus` are new exports.
