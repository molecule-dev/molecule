/**
 * React hook for code editor provider.
 *
 * @module
 */

import { useCallback, useContext, useMemo, useRef, useSyncExternalStore } from 'react'

import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import { t } from '@molecule/app-i18n'

import { EditorContext } from '../contexts.js'
import type { UseEditorResult } from '../types.js'

/**
 * Access the editor provider from context.
 * @returns The EditorProvider instance from the nearest EditorContext.
 * @throws {Error} If called outside an EditorProvider.
 */
export function useEditorProvider(): EditorProvider {
  const provider = useContext(EditorContext)
  if (!provider) {
    throw new Error(
      t('react.error.useEditorOutsideProvider', undefined, {
        defaultValue: 'useEditorProvider must be used within an EditorProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook for code editor management.
 *
 * `tabs` and `activeFile` always come from the provider's own tab list:
 * `activeFile` is the path of the tab marked `isActive`, or `null` when no
 * tab is. They are read at mount (tabs opened before the component mounted
 * show at once), on every provider change event, and after each action that
 * changes the tab list (`openFile`, `closeFile`, `setActiveTab`, `openDiff`,
 * `closeDiff`, `pinTab`).
 *
 * @returns Editor state and controls: tabs, activeFile, openFile, closeFile, getContent, setContent, setActiveTab, mount, dispose, and focus.
 */
export function useEditor(): UseEditorResult {
  const provider = useEditorProvider()

  /**
   * The provider's tab list as React sees it. It is refreshed on every change
   * event and after every action below, so `tabs` keeps its identity between
   * changes even when the provider builds a fresh array per `getTabs()` call.
   */
  const tabsRef = useRef<{ provider: EditorProvider; tabs: EditorTab[] } | null>(null)
  /** React's re-read callback while subscribed; the actions below re-render through it. */
  const notifyRef = useRef<(() => void) | null>(null)

  const getTabsSnapshot = useCallback((): EditorTab[] => {
    const cached = tabsRef.current
    if (cached && cached.provider === provider) return cached.tabs
    const tabs = provider.getTabs()
    tabsRef.current = { provider, tabs }
    return tabs
  }, [provider])

  const subscribeTabs = useCallback(
    (onChange: () => void): (() => void) => {
      // Read once on subscribing too: a change between the first render and this
      // subscription, or a replaced provider, sends no event this subscription
      // could see.
      tabsRef.current = { provider, tabs: provider.getTabs() }
      notifyRef.current = onChange
      const unsubscribe = provider.onChange(() => {
        tabsRef.current = { provider, tabs: provider.getTabs() }
        onChange()
      })
      return () => {
        notifyRef.current = null
        unsubscribe()
      }
    },
    [provider],
  )

  // Re-reads the provider's tab list, which also carries the active tab.
  const syncTabs = useCallback((): void => {
    tabsRef.current = { provider, tabs: provider.getTabs() }
    notifyRef.current?.()
  }, [provider])

  const tabs = useSyncExternalStore(subscribeTabs, getTabsSnapshot, getTabsSnapshot)
  const activeFile = useMemo(() => tabs.find((tab) => tab.isActive)?.path ?? null, [tabs])

  const openFile = useCallback(
    (file: EditorFile) => {
      provider.openFile(file)
      syncTabs()
    },
    [provider, syncTabs],
  )

  const closeFile = useCallback(
    (path: string) => {
      provider.closeFile(path)
      syncTabs()
    },
    [provider, syncTabs],
  )

  const getContent = useCallback(() => provider.getContent(), [provider])

  const setContent = useCallback(
    (path: string, content: string) => provider.setContent(path, content),
    [provider],
  )

  const setActiveTab = useCallback(
    (path: string) => {
      provider.setActiveTab(path)
      syncTabs()
    },
    [provider, syncTabs],
  )

  const mount = useCallback(
    (...args: Parameters<EditorProvider['mount']>) => provider.mount(...args),
    [provider],
  )

  const dispose = useCallback(() => provider.dispose(), [provider])
  const focus = useCallback(() => provider.focus(), [provider])

  const openDiff = useCallback(
    (file: DiffFile) => {
      provider.openDiff?.(file)
      syncTabs()
    },
    [provider, syncTabs],
  )
  const closeDiff = useCallback(() => {
    provider.closeDiff?.()
    syncTabs()
  }, [provider, syncTabs])

  const pinTab = useCallback(
    (path: string) => {
      provider.pinTab?.(path)
      syncTabs()
    },
    [provider, syncTabs],
  )

  const addExtraLib = useCallback(
    (content: string, filePath: string) => {
      provider.addExtraLib?.(content, filePath)
    },
    [provider],
  )

  const onFixWithAI = useCallback(
    (callback: (request: FixWithAIRequest) => void) => {
      return provider.onFixWithAI?.(callback) ?? (() => {})
    },
    [provider],
  )

  return {
    tabs,
    activeFile,
    openFile,
    closeFile,
    getContent,
    setContent,
    setActiveTab,
    mount,
    dispose,
    focus,
    openDiff,
    closeDiff,
    pinTab,
    addExtraLib,
    onFixWithAI,
  }
}
