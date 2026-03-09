/**
 * Code editor panel with tab bar and Monaco integration.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useCallback } from 'react'

import { useEditor, useEditorProvider, useThemeMode, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EditorPanelProps } from '../types.js'
import { TabBar } from './TabBar.js'

/** Inject the countdown keyframes once. */
let styleInjected = false
function injectCountdownStyle(): void {
  if (styleInjected) return
  styleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes mol-format-countdown {
      from { width: 0%; }
      to   { width: 100%; }
    }
    @keyframes mol-format-toast-grow {
      from { width: 0%; }
      to   { width: 100%; }
    }
  `
  document.head.appendChild(style)
}

/**
 * Code editor panel with tab bar and Monaco integration.
 * @param root0 - The component props.
 * @param root0.className - Optional CSS class name for the container.
 * @param root0.onActiveFileChange
 * @param root0.onEditorReady
 * @param root0.onTabsChange
 * @param root0.fileStatuses
 * @param root0.formattingFile
 * @param root0.countdownFile
 * @param root0.countdownKey
 * @returns The rendered editor panel element.
 */
export function EditorPanel({
  className,
  onActiveFileChange,
  onEditorReady,
  onTabsChange,
  fileStatuses,
  formattingFile,
  countdownFile,
  countdownKey,
  formatEstimate = 2000,
}: EditorPanelProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const editorProvider = useEditorProvider()
  const themeMode = useThemeMode()
  const { tabs, activeFile, closeFile, setActiveTab, pinTab, mount, dispose } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)
  // Use a ref so onEditorReady never needs to be in the mount effect's dep array
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  // Inject keyframes on first render
  useEffect(() => {
    injectCountdownStyle()
  }, [])

  // Sync Monaco editor theme with app theme mode — runs before mount too,
  // so the stored config has the correct theme when the editor is created.
  useEffect(() => {
    editorProvider.updateConfig({ theme: themeMode === 'light' ? 'vs' : 'vs-dark' })
  }, [themeMode, editorProvider])

  // Formatting toast: visible tracks whether the toast is in the DOM,
  // animatingIn controls the CSS transition state (false = slide down / fade out).
  const isFormatting = !!(formattingFile && formattingFile === activeFile)
  const [visible, setVisible] = useState(false)
  const [animatingIn, setAnimatingIn] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isFormatting) {
      // Show toast
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      setVisible(true)
      // Trigger enter animation on next frame so the transition fires
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatingIn(true)
        })
      })
    } else if (visible) {
      // Start exit animation, then remove from DOM
      setAnimatingIn(false)
      hideTimerRef.current = setTimeout(() => {
        setVisible(false)
        hideTimerRef.current = null
      }, 300)
    }
  }, [isFormatting])

  // Countdown progress bar visible for the active file
  const showCountdown = !!(countdownFile && countdownFile === activeFile)

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
        .then(() => {
          onEditorReadyRef.current?.()
        })
        .catch(() => {
          mountedRef.current = false
        })
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
      <TabBar
        tabs={tabs}
        activeFile={activeFile}
        onSelect={handleTabSelect}
        onClose={closeFile}
        onDoubleClick={pinTab}
        fileStatuses={fileStatuses}
      />

      {/* Editor container — hidden when no tabs to avoid showing a blank editor */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            visibility: tabs.length === 0 ? 'hidden' : 'visible',
          }}
        />

        {/* Countdown progress line — grows from left to right over 700ms (matches debounce) */}
        {showCountdown && (
          <div
            key={countdownKey}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 2,
              backgroundColor: 'var(--mol-color-primary, #4070e0)',
              zIndex: 1000,
              pointerEvents: 'none',
              animation: 'mol-format-countdown 700ms linear forwards',
            }}
          />
        )}

        {/* Formatting toast */}
        {visible && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 16,
              padding: '6px 12px',
              fontSize: 13,
              lineHeight: '22px',
              backgroundColor: 'var(--color-surface, #151515)',
              color: 'inherit',
              border: '1px solid rgba(128, 128, 128, 0.15)',
              borderRadius: 6,
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              pointerEvents: 'none',
              transform: animatingIn ? 'translateY(0)' : 'translateY(8px)',
              opacity: animatingIn ? 1 : 0,
              transition: 'transform 200ms ease-out, opacity 200ms ease-out',
            }}
          >
            {t('ide.formatting', undefined, { defaultValue: 'Formatting…' })}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 2,
                backgroundColor: 'var(--mol-color-primary, #4070e0)',
                animation: `mol-format-toast-grow ${formatEstimate}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

EditorPanel.displayName = 'EditorPanel'
