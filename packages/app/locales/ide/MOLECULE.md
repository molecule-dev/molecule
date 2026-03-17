# @molecule/app-locales-ide

Translations for molecule IDE components in 79 languages

## Purpose

Provides translations for the `@molecule/app-ide` package which has 118 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Usage

```typescript
import { af, am, ar } from '@molecule/app-locales-ide'
import type { IdeTranslationKey, IdeTranslations } from '@molecule/app-locales-ide'
```

## Translation Keys

| Key | English |
|-----|---------|
| `ide.chat.title` | Chat |
| `ide.chat.placeholder` | Send a message... |
| `ide.chat.emptyState` | Describe what you want to build... |
| `ide.chat.you` | You |
| `ide.chat.molecule` | Molecule |
| `ide.chat.stop` | Stop |
| `ide.chat.send` | Send |
| `ide.chat.commit` | Commit |
| `ide.chat.committing` | Committing... |
| `ide.chat.committed` | Committed |
| `ide.chat.commitFailed` | Commit failed |
| `ide.chat.commitLabel` | Commit |
| `ide.chat.retryCommit` | Retry |
| `ide.chat.thinking` | Thinking |
| `ide.chat.fileCount` | {{count}} files |
| `ide.chat.uncommittedFileCount` | {{count}} uncommitted files |
| `ide.chat.newChat` | New chat |
| `ide.chat.searchConversations` | Search conversations… |
| `ide.chat.askUserPlaceholder` | Or type your own… |
| `ide.chat.askUserSubmit` | Send |
| `ide.chat.attachFile` | Attach file |
| `ide.chat.changeModel` | Change model |
| `ide.chat.continueButton` | Continue |
| `ide.chat.continuePrompt` | Continue implementing from where you left off. |
| `ide.chat.currentBadge` | current |
| `ide.chat.currentModelLabel` | Current: {{name}} |
| `ide.chat.dropFilesHere` | Drop files here |
| `ide.chat.fileTooLarge` | File is too large. Maximum size is {{maxSize}}MB. |
| `ide.chat.increaseLoops` | Increase max loops |
| `ide.chat.loopLimitReached` | Reached the maximum of {{max}} tool iterations. |
| `ide.chat.maxLoopsError` | Failed to update max tool iterations. |
| `ide.chat.maxLoopsSet` | Max tool iterations set to {{n}} |
| `ide.chat.modelError` | Failed to update chat model. |
| `ide.chat.modelSet` | Chat model set to {{name}} |
| `ide.chat.modelUsage` | Usage: /model <model-name>  (e.g. claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001) |
| `ide.chat.queued` | Queued |
| `ide.chat.redoChange` | Re-apply this change |
| `ide.chat.responseStopped` | Response stopped |
| `ide.chat.revertFile` | Revert to last commit |
| `ide.chat.selectModel` | Select model |
| `ide.chat.signUpRequired` | Sign up to use |
| `ide.chat.undoChange` | Undo this change |
| `ide.chat.voice` | Voice |
| `ide.editor.title` | Editor |
| `ide.editor.emptyState` | Open a file to start editing |
| `ide.files.empty` | No files |
| `ide.preview.title` | Preview |
| `ide.preview.refresh` | Refresh preview |
| `ide.preview.openNewTab` | Open in new tab |
| `ide.preview.livePreview` | Live Preview |
| `ide.preview.starting` | Loading preview... |
| `ide.preview.restarting` | Loading preview... |
| `ide.preview.noPreview` | No preview available |
| `ide.device.label` | Device frame |
| `ide.device.responsive` | Responsive |
| `ide.device.desktop` | Desktop |
| `ide.device.tablet` | Tablet |
| `ide.device.mobile` | Mobile |
| `ide.toolCall.running` | running... |
| `ide.toolCall.input` | Input |
| `ide.toolCall.output` | Output |
| `ide.toolCall.statusRunning` | Running… |
| `ide.toolCall.statusNotFound` | Not found |
| `ide.toolCall.statusPermissionDenied` | Permission denied |
| `ide.toolCall.statusFailed` | Failed |
| `ide.toolCall.statusUnchanged` | Unchanged |
| `ide.toolCall.statusServerError` | Server error |
| `ide.toolCall.entryCount` | {{count}} entries |
| `ide.toolCall.matchCount` | {{count}} matches |
| `ide.toolCall.fileCount` | {{count}} files |
| `ide.toolCall.written` | Written |
| `ide.toolCall.newFileLines` | new file, {{count}} lines |
| `ide.toolCall.linesAdded` | +{{count}} lines |
| `ide.toolCall.linesRemoved` | −{{count}} lines |
| `ide.toolCall.changesApplied` | {{count}} changes applied |
| `ide.toolCall.applied` | Applied |
| `ide.toolCall.empty` | (empty) |
| `ide.toolCall.noOutput` | (no output) |
| `ide.toolCall.noFilesFound` | No files found |
| `ide.toolCall.noMatches` | No matches |
| `ide.toolCall.truncated` | … (truncated) |
| `ide.toolCall.andMore` | … and {{count}} more |
| `ide.tabs.close` | Close {{fileName}} |
| `ide.contextMenu.open` | Open |
| `ide.contextMenu.newFile` | New File... |
| `ide.contextMenu.newFolder` | New Folder... |
| `ide.contextMenu.rename` | Rename |
| `ide.contextMenu.delete` | Delete |
| `ide.contextMenu.copyPath` | Copy Path |
| `ide.contextMenu.copyRelativePath` | Copy Relative Path |
| `ide.contextMenu.collapseAll` | Collapse All |
| `ide.commandPalette.placeholder` | Type a command… |
| `ide.formatting` | Formatting… |
| `ide.quickOpen.placeholder` | Search files by name… |
| `ide.quickPicker.placeholder` | Type to search… |
| `ide.quickPicker.loading` | Loading… |
| `ide.quickPicker.noResults` | No matching results |
| `ide.search.placeholder` | Search |
| `ide.search.replacePlaceholder` | Replace |
| `ide.search.caseSensitive` | Match Case |
| `ide.search.wholeWord` | Match Whole Word |
| `ide.search.regex` | Use Regular Expression |
| `ide.search.toggleReplace` | Toggle Replace |
| `ide.search.toggleFilters` | Toggle Filters |
| `ide.search.replaceAll` | Replace All |
| `ide.search.replaceAllShort` | All |
| `ide.search.replaceInFile` | Replace in this file |
| `ide.search.confirm` | Confirm |
| `ide.search.confirmReplaceAll` | Click again to confirm |
| `ide.search.clear` | Clear |
| `ide.search.noResults` | No results found |
| `ide.search.searching` | Searching… |
| `ide.search.includeFiles` | Files to include (e.g. *.ts) |
| `ide.search.excludeFiles` | Files to exclude (e.g. *.min.js) |
| `ide.shortcuts.title` | Keyboard Shortcuts |
| `ide.shortcuts.hint` | Arrow keys to navigate · Enter to run · Esc to close |
| `ide.sidebar.files` | Explorer |
| `ide.sidebar.search` | Search |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-ide`
