/**
 * The molecule.dev IDE for Solid: the counterpart of `@molecule/app-ide-react`, with
 * the same exports and props and the same DOM for the same input. The framework-neutral half
 * (commands, settings, chat, tests, share and shortcut utilities, panel types) is
 * `@molecule/app-ide-panel-logic`'s, re-exported here.
 *
 * @example
 * ```tsx
 * import type { ParentProps } from 'solid-js'
 * import { useNarrowViewport } from '@molecule/app-ide-solid'
 *
 * function Layout(props: ParentProps) {
 *   const narrow = useNarrowViewport()
 *   return <div data-layout={narrow() ? 'stacked' : 'split'}>{props.children}</div>
 * }
 * ```
 *
 * This file is generated from the files present (do not edit it by hand).
 *
 * @module
 */

export * from './components/ActivityCard.jsx'
export * from './components/ChatPanel.jsx'
export * from './components/ChatTimestamp.jsx'
export * from './components/CommandPalette.jsx'
export * from './components/DeviceFrameSelector.jsx'
export * from './components/EditorPanel.jsx'
export * from './components/FileExplorer.jsx'
export * from './components/Icon.jsx'
export * from './components/KeyboardShortcutsPanel.jsx'
export * from './components/PreviewPanel.jsx'
export * from './components/QuickOpen.jsx'
export * from './components/QuickPicker.jsx'
export * from './components/ReportModal.jsx'
export * from './components/ResizeHandle.jsx'
export * from './components/SearchPanel.jsx'
export * from './components/ShareLinkManager.jsx'
export * from './components/ShareModal.jsx'
export * from './components/SidebarTabs.jsx'
export * from './components/TabBar.jsx'
export * from './components/TestsCard.jsx'
export * from './components/ToolCallCard.jsx'
export * from './components/UserAvatar.jsx'
export * from './components/WorkspaceLayout.jsx'
export * from './hooks/index.js'
export * from '@molecule/app-ide-panel-logic'
