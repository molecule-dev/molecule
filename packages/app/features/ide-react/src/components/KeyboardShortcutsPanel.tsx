/**
 * Keyboard shortcuts reference panel — displays all available shortcuts
 * grouped by category with keyboard navigation.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { KeyboardShortcutsPanelProps, ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { useThemeMode, useTranslation } from '@molecule/app-react'
import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'

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
 * @param props - Component props.
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
 * @param props - Component props.
 * @returns The keyboard shortcuts panel element.
 */
export function KeyboardShortcutsPanel({
  shortcuts,
  onDismiss,
}: KeyboardShortcutsPanelProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  const dialogRef = useRef<HTMLDivElement>(null)
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

  const onKeyDown = (e: KitKeyboardEvent): void => {
    switch (e.key) {
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
  }

  // The selected-row tint follows the theme primary (so a rebranded app tints
  // its own picker), never a literal blue; the hex is only the CSS-var fallback.
  const selectedBg = isLight
    ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
    : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)'

  // Build a flat index counter to map grouped rendering back to flat index
  let flatIndex = -1

  return (
    <Modal
      open
      onClose={onDismiss}
      ref={dialogRef}
      initialFocus={dialogRef}
      onKeyDown={onKeyDown}
      showCloseButton={false}
      aria-label={t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' })}
      style={{ maxHeight: '70vh' }}
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
        {/* mol-bespoke-button: icon-only ✕ panel dismiss — the IDE's one
            dismiss mark (same SVG, same 4px-radius square box, same hover
            scrim as the tab close and the chat-card dismisses), on the full
            44px coarse floor DESIGN.md reserves for icon-only ✕ dismisses.
            It was a bare text × with no label and no hit floor. */}
        <button
          type="button"
          data-mol-id="shortcuts-close"
          onClick={onDismiss}
          aria-label={t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })}
          title={t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })}
          className={cm.cn(cm.touchTarget, cm.shrink0)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            opacity: 0.6,
            transition: 'opacity 100ms, background 100ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
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
                  data-mol-id={`shortcut-row-${idx}`}
                  onClick={() => {
                    if (entry.execute) {
                      entry.execute()
                      onDismiss()
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cm.touchTargetCompact}
                  /* mol-bespoke-button: a shortcut-list ROW (label + key
                     badges) with keyboard-driven selection — a list item, not
                     a CTA. Its selected tint is a theme token and its 36px
                     coarse floor comes from the ClassMap. */
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
    </Modal>
  )
}

KeyboardShortcutsPanel.displayName = 'KeyboardShortcutsPanel'
