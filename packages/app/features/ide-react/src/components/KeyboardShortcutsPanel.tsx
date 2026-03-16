/**
 * Keyboard shortcuts reference panel — displays all available shortcuts
 * grouped by category with keyboard navigation.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'

import type { KeyboardShortcutsPanelProps, ShortcutEntry } from '../types.js'

/**
 * Groups shortcuts by category, preserving insertion order.
 * @param shortcuts - Flat list of shortcut entries.
 * @returns Map from category name to entries in that category.
 */
function groupByCategory(shortcuts: ShortcutEntry[]): Map<string, ShortcutEntry[]> {
  const groups = new Map<string, ShortcutEntry[]>()
  for (const entry of shortcuts) {
    const cat = entry.category ?? ''
    const list = groups.get(cat)
    if (list) {
      list.push(entry)
    } else {
      groups.set(cat, [entry])
    }
  }
  return groups
}

/**
 * Renders a single key badge.
 * @param root0 - Component props.
 * @param root0.children - The key label text.
 * @param root0.isLight - Whether light theme is active.
 * @returns The key badge element.
 */
function KeyBadge({ children, isLight }: { children: string; isLight: boolean }): JSX.Element {
  return (
    <kbd
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        fontSize: 11,
        fontFamily: 'system-ui, sans-serif',
        lineHeight: '16px',
        borderRadius: 4,
        border: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
        background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
        color: 'var(--mol-color-text, currentColor)',
        minWidth: 20,
        textAlign: 'center',
      }}
    >
      {children}
    </kbd>
  )
}

/**
 * Keyboard shortcuts reference panel.
 *
 * @param root0 - The component props.
 * @param root0.shortcuts - Shortcut entries to display.
 * @param root0.onDismiss - Called on Escape or backdrop click.
 * @returns The keyboard shortcuts panel element.
 */
export function KeyboardShortcutsPanel({
  shortcuts,
  onDismiss,
}: KeyboardShortcutsPanelProps): JSX.Element {
  const isLight = useThemeMode() === 'light'
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const groups = useMemo(() => groupByCategory(shortcuts), [shortcuts])

  // Flat list for keyboard navigation indexing
  const flatEntries = useMemo(() => {
    const entries: ShortcutEntry[] = []
    for (const group of groups.values()) {
      entries.push(...group)
    }
    return entries
  }, [groups])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const buttons = listRef.current.querySelectorAll('[data-shortcut-row]')
    const el = buttons[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onDismiss()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatEntries.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter': {
          e.preventDefault()
          const entry = flatEntries[selectedIndex]
          if (entry?.execute) {
            entry.execute()
            onDismiss()
          }
          break
        }
      }
    },
    [onDismiss, flatEntries, selectedIndex],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  // Focus the panel so keyboard events work immediately
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  const selectedBg = isLight ? 'rgba(64,112,224,0.12)' : 'rgba(64,112,224,0.25)'

  // Build a flat index counter to map grouped rendering back to flat index
  let flatIndex = -1

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.4)',
        }}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          maxWidth: '90vw',
          maxHeight: '70vh',
          zIndex: 1001,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: isLight
            ? '0 8px 32px rgba(0,0,0,0.18)'
            : '0 8px 32px rgba(0,0,0,0.6)',
          background: isLight ? '#fff' : 'var(--mol-color-background, #1e1e1e)',
          border: '1px solid var(--color-border, #333)',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--color-border, #333)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' })}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: '2px 6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--mol-color-text-secondary, #888)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Shortcut list */}
        <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {Array.from(groups.entries()).map(([category, entries]) => (
            <div key={category}>
              {category && (
                <div
                  style={{
                    padding: '8px 16px 4px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--mol-color-text-secondary, #888)',
                  }}
                >
                  {category}
                </div>
              )}
              {entries.map((entry) => {
                flatIndex++
                const idx = flatIndex
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={entry.label}
                    type="button"
                    data-shortcut-row
                    onClick={() => {
                      if (entry.execute) {
                        entry.execute()
                        onDismiss()
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 16px',
                      fontSize: 13,
                      width: '100%',
                      border: 'none',
                      background: isSelected ? selectedBg : 'transparent',
                      color: 'var(--mol-color-text, currentColor)',
                      cursor: entry.execute ? 'pointer' : 'default',
                      textAlign: 'left',
                      borderRadius: 0,
                    }}
                  >
                    <span>{entry.label}</span>
                    <span style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 16 }}>
                      {entry.keys.split(' ').map((part, i) => (
                        <KeyBadge key={i} isLight={isLight}>
                          {part}
                        </KeyBadge>
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-border, #333)',
            fontSize: 11,
            color: 'var(--mol-color-text-secondary, #888)',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {t('ide.shortcuts.hint', undefined, {
            defaultValue: 'Arrow keys to navigate · Enter to run · Esc to close',
          })}
        </div>
      </div>
    </>
  )
}

KeyboardShortcutsPanel.displayName = 'KeyboardShortcutsPanel'
