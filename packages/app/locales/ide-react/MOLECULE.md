# @molecule/app-locales-ide-react

Translations for the `@molecule/app-ide` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-ide-react` package, which has 140 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as ide_react from '@molecule/app-locales-ide-react'
import type { IdeTranslationKey, IdeTranslations } from '@molecule/app-locales-ide-react'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [ide_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `ide.chat.thoughtBriefly` | Thought briefly |
| `ide.chat.thinking` | Thinking |
| `ide.chat.verificationPassed` | Checks passed |
| `ide.chat.typeErrorCount` | 1 type error |
| `ide.chat.lintErrorCount` | 1 lint error |
| `ide.chat.lintWarningCount` | 1 warning |
| `ide.chat.runtimeErrors` | Runtime errors |
| `ide.chat.verificationFailed` | Errors found |
| `ide.chat.viewPlans` | View plans |
| `ide.chat.committing` | Committing... |
| `ide.chat.commitLabel` | Commit |
| `ide.chat.redoCommit` | Re-apply this commit |
| `ide.chat.revertCommit` | Revert this commit |
| `ide.chat.fileCount` | {{count}} files |
| `common.cancel` | Cancel |
| `common.save` | Save |
| `ide.chat.queued` | Queued |
| `ide.chat.editQueued` | Edit |
| `ide.chat.deleteQueued` | Delete |
| `ide.chat.sendQueued` | Send |
| `ide.chat.responseStopped` | Response stopped |
| `ide.chat.changeModel` | Change model |
| `ide.chat.increaseLoops` | Increase max loops |
| `ide.chat.continueButton` | Continue |
| `ide.chat.continuePrompt` | Continue implementing from where you left off. |
| `upgrade.viewPlans` | Upgrade |
| `guest.reminder.message` | Sign up or log in to keep your work \u2014 guest sessions expire after 72 hours. |
| `upgrade.signUp` | Sign up |
| `guest.reminder.logIn` | Log in |
| `ide.chat.soundsError` | Failed to update sound settings. |
| `ide.chat.commitFailed` | Commit failed |
| `ide.chat.fileTooLarge` | File is too large. Maximum size is {{maxSize}}MB. |
| `ide.chat.modelSet` | Failed to update chat model. |
| `ide.chat.compacting` | Compacting conversation... |
| `ide.chat.compacted` | Context usage is low — no compaction needed. |
| `ide.chat.compactError` | Failed to compact conversation. |
| `ide.chat.switchedToPlan` | Switched to plan mode |
| `ide.chat.switchedToExecute` | Switched to execute mode |
| `ide.chat.costError` | Unable to fetch usage data. |
| `ide.chat.undoNoChanges` | No file changes to undo. |
| `ide.chat.undoComplete` | Failed to revert changes. |
| `ide.chat.diffNoChanges` | No uncommitted changes. |
| `ide.chat.diffError` | Failed to fetch changes. |
| `ide.chat.commitNoChanges` | No changes to commit. |
| `ide.chat.commitError` | Failed to commit changes. |
| `ide.chat.autoFixEnabled` | Auto-fix enabled. |
| `ide.chat.autoFixDisabled` | Auto-fix disabled. |
| `ide.chat.autoFixError` | Failed to update auto-fix setting. |
| `ide.chat.modelUsage` | Usage: /model <model-name>  (e.g. claude-opus-4-6, claude-sonnet-4-6, claude-hai |
| `ide.chat.modelUpgradeRequired` | Sign up |
| `ide.chat.maxLoopsReached` | Max loops limit reached. |
| `ide.chat.maxLoopsError` | Failed to update max tool iterations. |
| `ide.chat.dropFilesHere` | Drop files here |
| `ide.chat.showEarlier` | Show earlier messages |
| `ide.chat.autoFixPaused` | Auto-fix paused |
| `ide.chat.autoFixCountdown` | Resume |
| `ide.chat.autoFixPause` | Pause |
| `ide.chat.autoFixCancel` | Cancel |
| `ide.chat.reportProblem` | Report a problem |
| `ide.chat.version` | Molecule.dev v0.1.0 |
| `ide.chat.selectModel` | Select model |
| `ide.chat.currentModelLabel` | Loading models… |
| `ide.chat.currentBadge` | current |
| `ide.chat.proRequired` | Pro |
| `ide.chat.notificationSounds` | Notification sounds |
| `ide.chat.soundMode.mixed` | mixed |
| `ide.chat.soundAll` | All |
| `ide.chat.activeFile` | active |
| `ide.chat.openTab` | open |
| `ide.chat.uncommittedFileCount` | {{count}} uncommitted files |
| `ide.chat.switchToExecute` | Switch to execute mode |
| `ide.chat.switchToPlan` | Switch to plan mode |
| `ide.chat.attachFile` | Attach file |
| `ide.chat.newChat` | New chat |
| `ide.chat.searchConversations` | Search conversations… |
| `ide.commandPalette.placeholder` | Type a command… |
| `ide.formatting` | Formatting… |
| `ide.contextMenu.newFile` | New File... |
| `ide.contextMenu.newFolder` | New Folder... |
| `ide.contextMenu.paste` | Paste |
| `ide.contextMenu.collapseAll` | Collapse All |
| `ide.contextMenu.deleteCount` | Cut |
| `ide.contextMenu.copyPaths` | Copy Paths |
| `ide.contextMenu.copyRelativePaths` | Copy Relative Paths |
| `ide.contextMenu.rename` | Rename |
| `ide.contextMenu.delete` | Delete |
| `ide.contextMenu.cut` | Cut |
| `ide.contextMenu.copyPath` | Copy Path |
| `ide.contextMenu.copyRelativePath` | Copy Relative Path |
| `ide.contextMenu.open` | Open |
| `ide.shortcuts.title` | Keyboard Shortcuts |
| `ide.shortcuts.hint` | Arrow keys to navigate · Enter to run · Esc to close |
| `ide.preview.starting` | Loading preview... |
| `ide.preview.noPreview` | No preview available |
| `ide.preview.restarting` | Loading preview... |
| `ide.preview.retryCount` | Retry attempt {{count}} |
| `ide.quickOpen.placeholder` | Search files by name… |
| `ide.quickPicker.placeholder` | Type to search… |
| `ide.quickPicker.loading` | Loading… |
| `ide.quickPicker.noResults` | No matching results |
| `ide.search.replaceInFile` | Replace in this file |
| `ide.search.toggleReplace` | Toggle Replace |
| `ide.search.placeholder` | Search |
| `ide.search.clear` | Clear |
| `ide.search.replacePlaceholder` | Replace |
| `ide.search.confirmReplaceAll` | Click again to confirm |
| `ide.search.replaceAll` | Replace All |
| `ide.search.confirm` | Confirm |
| `ide.search.replaceAllShort` | All |
| `ide.search.replaceConfirmation` | Match Case |
| `ide.search.wholeWord` | Match Whole Word |
| `ide.search.regex` | Use Regular Expression |
| `ide.search.toggleFilters` | Toggle Filters |
| `ide.search.includeFiles` | Files to include (e.g. *.ts) |
| `ide.search.excludeFiles` | Files to exclude (e.g. *.min.js) |
| `ide.search.resultsTruncated` | No results found |
| `ide.search.searching` | Searching… |
| `ide.sidebar.files` | Explorer |
| `ide.sidebar.search` | Search |
| `ide.toolCall.noOutput` | (no output) |
| `ide.toolCall.written` | Written |
| `ide.toolCall.statusUnchanged` | Unchanged |
| `ide.toolCall.newFileLines` | new file, {{count}} lines |
| `ide.toolCall.empty` | (empty) |
| `ide.toolCall.truncated` | … (truncated) |
| `ide.toolCall.noFilesFound` | No files found |
| `ide.toolCall.noMatches` | No matches |
| `ide.toolCall.andMore` | … and {{count}} more |
| `ide.chat.askUserPlaceholder` | Or something else… |
| `ide.chat.askUserSubmit` | Send |
| `ide.chat.redoChange` | Re-apply this change |
| `ide.chat.undoChange` | Undo this change |
| `ide.toolCall.statusRunning` | Running… |
| `ide.toolCall.statusNotFound` | Not found |
| `ide.toolCall.statusPermissionDenied` | Permission denied |
| `ide.toolCall.statusFailed` | Failed |
| `ide.toolCall.entryCount` | {{count}} entries |
| `ide.toolCall.matchCount` | {{count}} matches |
| `ide.toolCall.fileCount` | {{count}} files |
| `ide.toolCall.statusServerError` | Server error |
