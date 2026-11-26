/**
 * Reusable quick picker overlay — used by Quick Open and Command Palette.
 *
 * Provides a filterable, keyboard-navigable list rendered at the top-center
 * of the viewport.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { fuzzyScore } from '@molecule/app-ide-panel-logic/panels'
import { useThemeMode, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import type { QuickPickerProps } from '../types.js'

/**
 * Quick picker overlay with keyboard navigation.
 *
 * @param props - Component props.
 * @returns The quick picker element.
 */
export function QuickPicker({
  items,
  placeholder,
  onSelect,
  onDismiss,
  loading,
  initialQuery,
  className,
}: QuickPickerProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const [query, setQuery] = useState(initialQuery ?? '')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter and sort items by fuzzy match
  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const scored = items
      .map((item) => ({ item, score: fuzzyScore(query, item.label) }))
      .filter((s) => s.score >= 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.item)
  }, [items, query])

  // Reset the selection when the filtered list changes, DURING the render that
  // replaced it (React's "adjust state when a prop changes" pattern): an effect
  // would run only after the replaced list has rendered, so one frame would
  // paint the old index highlighted on the new list.
  const [renderedFiltered, setRenderedFiltered] = useState(filtered)
  if (renderedFiltered !== filtered) {
    setRenderedFiltered(filtered)
    setSelectedIndex(0)
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Not memoized: its only consumers are the DOM `onKeyDown` props of the input
  // and the rows, and it reads `filtered`/`selectedIndex`, so a memo's identity
  // would change on every keystroke anyway.
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex])
        }
        break
    }
  }

  // The selected-row tint follows the theme primary (so a rebranded app tints
  // its own picker), never a literal blue; the hex is only the CSS-var fallback.
  const selectedBg = isLight
    ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
    : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)'

  return (
    <Modal
      open
      onClose={onDismiss}
      initialFocus={inputRef}
      showCloseButton={false}
      centered={!isNarrow}
      aria-label={t('ide.quickPicker.label', undefined, { defaultValue: 'Quick picker' })}
      className={className}
      style={isNarrow ? { maxHeight: 'min(60dvh, 480px)' } : undefined}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ??
          t('ide.quickPicker.placeholder', undefined, { defaultValue: 'Type to search…' })
        }
        style={{
          width: '100%',
          // 16px on phones/touch devices — below that iOS Safari zooms the
          // page when this (autofocused) input receives focus.
          fontSize: isNarrow || isCoarse ? 16 : 13,
          padding: '10px 12px',
          border: 'none',
          borderBottom: '1px solid var(--color-border, #333)',
          background: 'transparent',
          color: 'var(--mol-color-text, currentColor)',
          outline: 'none',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      />
      <div
        ref={listRef}
        style={{
          // On narrow viewports the flex-column container's dvh cap governs
          // instead of a fixed pixel height — the list shrinks to whatever
          // fits above the on-screen keyboard.
          maxHeight: isNarrow ? undefined : 300,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        {loading && (
          <div
            style={{
              padding: '12px',
              fontSize: 12,
              color: 'var(--mol-color-text-secondary, #888)',
              textAlign: 'center',
            }}
          >
            {t('ide.quickPicker.loading', undefined, { defaultValue: 'Loading…' })}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              padding: '12px',
              fontSize: 12,
              color: 'var(--mol-color-text-secondary, #888)',
              textAlign: 'center',
            }}
          >
            {t('ide.quickPicker.noResults', undefined, { defaultValue: 'No matching results' })}
          </div>
        )}
        {!loading &&
          filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              data-mol-id={`quick-picker-item-${item.id}`}
              onClick={() => onSelect(item)}
              onKeyDown={handleKeyDown}
              onMouseEnter={() => setSelectedIndex(i)}
              className={cm.touchTargetCompact}
              /* mol-bespoke-button: a picker ROW (icon + label + detail) with
                 keyboard-driven selection — a list item, not a CTA. Selected
                 tint is a theme token; the ≥36px coarse floor is the
                 ClassMap's (it was a hand-rolled `minHeight: 36`). */
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: i === selectedIndex ? selectedBg : 'transparent',
                color: 'var(--mol-color-text, currentColor)',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              {item.icon}
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
              {item.detail && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--mol-color-text-secondary, #888)',
                    flexShrink: 0,
                  }}
                >
                  {item.detail}
                </span>
              )}
            </button>
          ))}
      </div>
    </Modal>
  )
}

QuickPicker.displayName = 'QuickPicker'
