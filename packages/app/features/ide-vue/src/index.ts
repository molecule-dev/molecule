/**
 * The molecule.dev IDE for Vue: the counterpart of `@molecule/app-ide-react`, with
 * the same exports and props and the same DOM for the same input. The framework-neutral half
 * (commands, settings, chat, tests, share and shortcut utilities, panel types) is
 * `@molecule/app-ide-panel-logic`'s, re-exported here.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { useNarrowViewport } from '@molecule/app-ide-vue'
 *
 * const Layout = defineComponent({
 *   setup(_props, { slots }) {
 *     const narrow = useNarrowViewport()
 *     return () => h('div', { 'data-layout': narrow.value ? 'stacked' : 'split' }, slots.default?.())
 *   },
 * })
 * ```
 *
 * This file is generated from the files present (do not edit it by hand).
 *
 * @module
 */

export * from './components/ActivityCard.js'
export * from './components/ChatPanel.js'
export * from './components/ChatTimestamp.js'
export * from './components/CommandPalette.js'
export * from './components/DeviceFrameSelector.js'
export * from './components/EditorPanel.js'
export * from './components/FileExplorer.js'
export * from './components/Icon.js'
export * from './components/KeyboardShortcutsPanel.js'
export * from './components/PreviewPanel.js'
export * from './components/QuickOpen.js'
export * from './components/QuickPicker.js'
export * from './components/ReportModal.js'
export * from './components/ResizeHandle.js'
export * from './components/SearchPanel.js'
export * from './components/ShareLinkManager.js'
export * from './components/ShareModal.js'
export * from './components/SidebarTabs.js'
export * from './components/TabBar.js'
export * from './components/TestsCard.js'
export * from './components/ToolCallCard.js'
export * from './components/UserAvatar.js'
export * from './components/WorkspaceLayout.js'
export * from './hooks/index.js'
export * from '@molecule/app-ide-panel-logic'
