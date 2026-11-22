/**
 * The molecule.dev IDE for Angular: the counterpart of `@molecule/app-ide-react`, with
 * the same exports and props and the same DOM for the same input. The framework-neutral half
 * (commands, settings, chat, tests, share and shortcut utilities, panel types) is
 * `@molecule/app-ide-panel-logic`'s, re-exported here.
 *
 * @example
 * ```typescript
 * import { Component } from '@angular/core'
 * import { useNarrowViewport } from '@molecule/app-ide-angular'
 *
 * @Component({
 *   selector: 'app-layout',
 *   template: `<div [attr.data-layout]="narrow() ? 'stacked' : 'split'"><ng-content /></div>`,
 * })
 * export class Layout {
 *   protected readonly narrow = useNarrowViewport()
 * }
 * ```
 *
 * This file is generated from the files present (do not edit it by hand).
 *
 * @module
 */

export * from './components/activity-card.component.js'
export * from './components/chat-panel.component.js'
export * from './components/chat-timestamp.component.js'
export * from './components/command-palette.component.js'
export * from './components/device-frame-selector.component.js'
export * from './components/editor-panel.component.js'
export * from './components/file-explorer.component.js'
export * from './components/icon.component.js'
export * from './components/keyboard-shortcuts-panel.component.js'
export * from './components/preview-panel.component.js'
export * from './components/quick-open.component.js'
export * from './components/quick-picker.component.js'
export * from './components/report-modal.component.js'
export * from './components/resize-handle.component.js'
export * from './components/search-panel.component.js'
export * from './components/share-link-manager.component.js'
export * from './components/share-modal.component.js'
export * from './components/sidebar-tabs.component.js'
export * from './components/tab-bar.component.js'
export * from './components/tests-card.component.js'
export * from './components/tool-call-card.component.js'
export * from './components/user-avatar.component.js'
export * from './components/workspace-layout.component.js'
export * from './hooks/index.js'
export * from '@molecule/app-ide-panel-logic'
