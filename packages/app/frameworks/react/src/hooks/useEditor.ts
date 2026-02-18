/**
 * React hook for code editor provider.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState } from 'react'

import type { EditorFile, EditorProvider, EditorTab } from '@molecule/app-code-editor'
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
 * @returns Editor state and controls: tabs, activeFile, openFile, closeFile, getContent, setContent, setActiveTab, mount, dispose, and focus.
 */
export function useEditor(): UseEditorResult {
  const provider = useEditorProvider()
  const [tabs, setTabs] = useState<EditorTab[]>(() => provider.getTabs())
  const [activeFile, setActiveFile] = useState<string | null>(null)

  // Subscribe to changes to update tabs and active file
  useEffect(() => {
    const unsubscribe = provider.onChange(() => {
      setTabs(provider.getTabs())
      const currentTabs = provider.getTabs()
      const active = currentTabs.find((t) => t.isActive)
      setActiveFile(active?.path ?? null)
    })
    return unsubscribe
  }, [provider])

  const openFile = useCallback(
    (file: EditorFile) => {
      provider.openFile(file)
      setTabs(provider.getTabs())
      setActiveFile(file.path)
    },
    [provider],
  )

  const closeFile = useCallback(
    (path: string) => {
      provider.closeFile(path)
      const updatedTabs = provider.getTabs()
      setTabs(updatedTabs)
      const active = updatedTabs.find((t) => t.isActive)
      setActiveFile(active?.path ?? null)
    },
    [provider],
  )

  const getContent = useCallback(() => provider.getContent(), [provider])

  const setContent = useCallback(
    (path: string, content: string) => provider.setContent(path, content),
    [provider],
  )

  const setActiveTab = useCallback(
    (path: string) => {
      provider.setActiveTab(path)
      setTabs(provider.getTabs())
      setActiveFile(path)
    },
    [provider],
  )

  const mount = useCallback(
    (...args: Parameters<typeof provider.mount>) => provider.mount(...args),
    [provider],
  )

  const dispose = useCallback(() => provider.dispose(), [provider])
  const focus = useCallback(() => provider.focus(), [provider])

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
  }
}
