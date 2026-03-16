/**
 * Reusable quick picker overlay — used by Quick Open and Command Palette.
 *
 * Provides a filterable, keyboard-navigable list rendered at the top-center
 * of the viewport.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { QuickPickerProps } from '../types.js'

/**
 * Simple fuzzy match: characters of the query must appear in order in the
 * label. Returns a score (higher is better) or -1 for no match.
 * @param query - The search query string.
 * @param label - The label to match against.
 * @returns A match score (higher is better) or -1 for no match.
 */
function fuzzyScore(query: string, label: string): number {
  const q = query.toLowerCase()
  const l = label.toLowerCase()
  let qi = 0
  let score = 0
  let consecutive = 0

  for (let li = 0; li < l.length && qi < q.length; li++) {
    if (l[li] === q[qi]) {
      qi++
      consecutive++
      score += consecutive + (li === 0 ? 5 : 0)
    } else {
      consecutive = 0
    }
  }
  return qi === q.length ? score : -1
}

/**
 * Quick picker overlay with keyboard navigation.
 *
 * @param root0 - The component props.
 * @param root0.items - Items to display.
 * @param root0.placeholder - Input placeholder.
 * @param root0.onSelect - Called when an item is selected.
 * @param root0.onDismiss - Called on Escape or backdrop click.
 * @param root0.loading - Show loading indicator.
 * @param root0.initialQuery - Pre-fill the search input.
 * @param root0.className - Optional CSS class name.
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
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  const [query, setQuery] = useState(initialQuery ?? '')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Filter and sort items by fuzzy match
  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const scored = items
      .map((item) => ({ item, score: fuzzyScore(query, item.label) }))
      .filter((s) => s.score >= 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.item)
  }, [items, query])

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
        case 'Escape':
          e.preventDefault()
          onDismiss()
          break
      }
    },
    [filtered, selectedIndex, onSelect, onDismiss],
  )

  const selectedBg = isLight ? 'rgba(64,112,224,0.12)' : 'rgba(64,112,224,0.25)'

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
      {/* Picker */}
      <div
        className={cm.cn(className)}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          maxWidth: '90vw',
          zIndex: 1001,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: isLight
            ? '0 8px 32px rgba(0,0,0,0.18)'
            : '0 8px 32px rgba(0,0,0,0.6)',
          background: isLight ? '#fff' : 'var(--mol-color-background, #1e1e1e)',
          border: '1px solid var(--color-border, #333)',
        }}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? t('ide.quickPicker.placeholder', undefined, { defaultValue: 'Type to search…' })}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 13,
            border: 'none',
            borderBottom: '1px solid var(--color-border, #333)',
            background: 'transparent',
            color: 'var(--mol-color-text, currentColor)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div
          ref={listRef}
          style={{
            maxHeight: 300,
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
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(i)}
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
      </div>
    </>
  )
}

QuickPicker.displayName = 'QuickPicker'
