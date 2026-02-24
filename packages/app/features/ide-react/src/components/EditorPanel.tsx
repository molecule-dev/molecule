/**
 * Code editor panel with tab bar and Monaco integration.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { t } from '@molecule/app-i18n'
import { useEditor } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EditorPanelProps } from '../types.js'
import { TabBar } from './TabBar.js'

/**
 * Code editor panel with tab bar and Monaco integration.
 * @param root0 - The component props.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered editor panel element.
 */
export function EditorPanel({ className }: EditorPanelProps): JSX.Element {
  const cm = getClassMap()
  const { tabs, activeFile, closeFile, setActiveTab, mount, dispose } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  // Mount the editor when the container is ready
  useEffect(() => {
    const container = containerRef.current
    if (!container || mountedRef.current) return

    mountedRef.current = true
    const result = mount(container)

    // Handle both sync and async mount
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>).catch(() => {
        mountedRef.current = false
      })
    }

    return () => {
      mountedRef.current = false
      dispose()
    }
  }, [mount, dispose])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
      {/* Header */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'row', align: 'center' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.shrink0,
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          cm.borderB,
        )}
      >
        {t('ide.editor.title')}
      </div>

      {/* Tab bar */}
      <TabBar tabs={tabs} activeFile={activeFile} onSelect={setActiveTab} onClose={closeFile} />

      {/* Editor container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      />

      {/* Empty state */}
      {tabs.length === 0 && (
        <div
          className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.textCenter)}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          {t('ide.editor.emptyState')}
        </div>
      )}
    </div>
  )
}

EditorPanel.displayName = 'EditorPanel'
