/**
 * Code editor panel with tab bar and Monaco integration.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { useCallback } from 'react'

import { useEditor } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EditorPanelProps } from '../types.js'
import { TabBar } from './TabBar.js'

/**
 * Code editor panel with tab bar and Monaco integration.
 * @param root0 - The component props.
 * @param root0.className - Optional CSS class name for the container.
 * @param root0.onActiveFileChange
 * @param root0.onEditorReady
 * @param root0.onTabsChange
 * @param root0.fileStatuses
 * @returns The rendered editor panel element.
 */
export function EditorPanel({ className, onActiveFileChange, onEditorReady, onTabsChange, fileStatuses }: EditorPanelProps): JSX.Element {
  const cm = getClassMap()
  const { tabs, activeFile, closeFile, setActiveTab, pinTab, mount, dispose } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)
  // Use a ref so onEditorReady never needs to be in the mount effect's dep array
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  // Notify parent whenever the active file changes (tab switch, open, close)
  useEffect(() => {
    onActiveFileChange?.(activeFile)
  }, [activeFile, onActiveFileChange])

  // Notify parent whenever the tab list changes (file opened or closed)
  useEffect(() => {
    onTabsChange?.(tabs.map((t) => t.path))
  }, [tabs, onTabsChange])

  const handleTabSelect = useCallback(
    (path: string) => {
      setActiveTab(path)
      onActiveFileChange?.(path)
    },
    [setActiveTab, onActiveFileChange],
  )

  // Mount the editor when the container is ready
  useEffect(() => {
    const container = containerRef.current
    if (!container || mountedRef.current) return

    mountedRef.current = true
    const result = mount(container)

    // Handle both sync and async mount
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>)
        .then(() => { onEditorReadyRef.current?.() })
        .catch(() => { mountedRef.current = false })
    } else {
      onEditorReadyRef.current?.()
    }

    return () => {
      mountedRef.current = false
      dispose()
    }
  }, [mount, dispose])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
      {/* Tab bar */}
      <TabBar tabs={tabs} activeFile={activeFile} onSelect={handleTabSelect} onClose={closeFile} onDoubleClick={pinTab} fileStatuses={fileStatuses} />

      {/* Editor container — hidden when no tabs to avoid showing a blank editor */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          visibility: tabs.length === 0 ? 'hidden' : 'visible',
        }}
      />
    </div>
  )
}

EditorPanel.displayName = 'EditorPanel'
