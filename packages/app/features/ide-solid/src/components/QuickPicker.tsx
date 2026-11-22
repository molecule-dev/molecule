/**
 * Reusable quick picker overlay — used by Quick Open and the Command Palette.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `QuickPicker` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. A filterable, keyboard-navigable list
 * rendered at the top-center of the viewport, above a click-away backdrop;
 * rows are ordered by a fuzzy score of the query, the highlighted row follows
 * the arrow keys and the pointer, and Enter selects it.
 *
 * The list is keyed the way React keys it (`item.id` per row) so a re-passed
 * or re-ordered `items` prop keeps each rendered row, the way React's `key`
 * does.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import { createComputed, createEffect, createMemo, createSignal, For, onMount } from 'solid-js'

import { fuzzyScore } from '@molecule/app-ide-panel-logic/panels'
import { useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

/** An item in the quick picker list. */
export interface QuickPickerItem {
  /** Unique identifier. */
  id: string
  /** Primary label. */
  label: string
  /** Secondary text shown beside the label. */
  detail?: string
  /** Optional icon node. */
  icon?: JSX.Element
}

/**
 * Properties for the reusable quick picker overlay — React's contract, the
 * React prop names.
 */
export interface QuickPickerProps {
  /** Items to display and filter. */
  items: QuickPickerItem[]
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Called when the user selects an item. */
  onSelect: (item: QuickPickerItem) => void
  /** Called when the user dismisses the picker (Escape or backdrop click). */
  onDismiss: () => void
  /** Show a loading indicator. */
  loading?: boolean
  /** Pre-fill the search input. */
  initialQuery?: string
  className?: string
}

/**
 * A React-keyed view of a list: the keys to iterate and the latest item per
 * key. Solid's `For` keys by object identity, so the picker iterates the KEYS
 * (`For` compares strings by value, so an unchanged key keeps its DOM node and
 * moves it on a reorder) and reads each item through `get`, which returns the
 * latest item for that key so the rendered content still updates reactively.
 *
 * This is the contract of `@molecule/app-ui-solid`'s `createKeyedList` (see
 * its `utilities/keyedList.ts`), which its package does not export — the same
 * mechanism the sibling components keep as stable per-key records.
 *
 * @template T - The list's item type.
 * @template K - The key type.
 * @param items - The list, as a reactive accessor.
 * @param keyOf - The key React assigns each item (`key={…}`).
 * @returns The keys to iterate and the item lookup to read.
 */
function createKeyedList<T, K extends string>(
  items: Accessor<T[]>,
  keyOf: (item: T) => K,
): { keys: Accessor<K[]>; get: (key: K) => T | undefined } {
  const keys = createMemo(() => items().map((item) => keyOf(item)))
  const byKey = createMemo(() => {
    const latest = new Map<K, T>()
    items().forEach((item) => latest.set(keyOf(item), item))
    return latest
  })
  return { keys, get: (key) => byKey().get(key) }
}

/**
 * Quick picker overlay with keyboard navigation.
 *
 * @param props - See {@link QuickPickerProps}.
 * @returns The rendered quick picker.
 */
export function QuickPicker(props: QuickPickerProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()
  const [query, setQuery] = createSignal(props.initialQuery ?? '')
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  let inputEl: HTMLInputElement | undefined
  let listEl: HTMLDivElement | undefined

  // Focus input on mount
  onMount(() => {
    inputEl?.focus()
  })

  // Filter and sort items by fuzzy match
  const filtered = createMemo<QuickPickerItem[]>(() => {
    if (!query().trim()) return props.items
    const scored = props.items
      .map((item) => ({ item, score: fuzzyScore(query(), item.label) }))
      .filter((s) => s.score >= 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.item)
  })

  // Reset selection when the filtered list changes, in the computation phase
  // (React resets during the render that replaced the list): a computation
  // runs BEFORE the DOM moves — Solid's `For` builds the replaced rows inside
  // a memo, so an effect would only re-color them afterwards, and a row that
  // is tinted and untinted like that carries `transparent` expanded, which a
  // row never tinted does not.
  createComputed(() => {
    void filtered()
    setSelectedIndex(0)
  })

  // Scroll selected item into view
  createEffect(() => {
    const el = listEl?.children[selectedIndex()] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })

  // The selected-row tint follows the theme primary (so a rebranded app tints
  // its own picker), never a literal blue; the hex is only the CSS-var fallback.
  const selectedBg = createMemo(() =>
    mode() === 'light'
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)',
  )

  // React keeps the search field's `value` ATTRIBUTE in step with the
  // controlled value (the DOM snapshot carries the attribute as well as the
  // live property); Solid's `value` prop writes only the property, so the
  // attribute is mirrored here. (Solid's `attr:value` writes the same
  // attribute; writing it needs a JSX type augmentation this package's
  // framework-UI packages each declare in their own .d.ts, and this component
  // ships without one.)
  createEffect(() => {
    inputEl?.setAttribute('value', query())
  })

  /**
   * The keyboard navigation: the arrows move the highlight within the
   * filtered rows (clamped), Enter selects it, Escape dismisses. Bound to
   * the panel, so a key press anywhere in it (the autofocus input first of
   * all) lands here.
   *
   * @param e - The key press.
   */
  function handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex() + 1, filtered().length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex() - 1, 0))
        break
      case 'Enter': {
        e.preventDefault()
        const chosen = filtered()[selectedIndex()]
        if (chosen) props.onSelect(chosen)
        break
      }
      case 'Escape':
        e.preventDefault()
        props.onDismiss()
        break
    }
  }

  // React keys each row by its item id, so a re-passed or re-ordered `items`
  // prop keeps every row's DOM node; the picker iterates the keys and reads
  // the latest item through the lookup.
  const list = createKeyedList(filtered, (item): string => item.id)

  // The style objects come from function CALLS, not inline literals: the
  // Solid JSX transform compiles an inline style object into one raw `style`
  // attribute string, whose one-shot parse loses shorthand declarations
  // React writes through the CSSOM (a `border-bottom` override over
  // `border: none`, a `flex: 1` expansion). A call keeps the binding live,
  // so each declaration is applied through `setProperty` the way React
  // writes them.
  const backdropStyle = (): Record<string, string> => ({
    position: 'fixed',
    inset: '0px',
    'z-index': '1000',
    background: 'rgba(0,0,0,0.4)',
  })
  const panelStyle = (): Record<string, string | undefined> => ({
    position: 'fixed',
    top: isNarrow() ? '10%' : '50%',
    left: '50%',
    transform: isNarrow() ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
    width: '500px',
    'max-width': '90vw',
    'max-height': isNarrow() ? 'min(60dvh, 480px)' : undefined,
    display: isNarrow() ? 'flex' : undefined,
    'flex-direction': isNarrow() ? 'column' : undefined,
    'z-index': '1001',
    'border-radius': '8px',
    overflow: 'hidden',
    'box-shadow': mode() === 'light' ? '0 8px 32px rgba(0,0,0,0.18)' : '0 8px 32px rgba(0,0,0,0.6)',
    background: mode() === 'light' ? '#fff' : 'var(--mol-color-background, #1e1e1e)',
    border: '1px solid var(--color-border, #333)',
  })
  const inputStyle = (): Record<string, string> => ({
    width: '100%',
    // 16px on phones/touch devices — below that iOS Safari zooms the page
    // when this (autofocused) input receives focus.
    'font-size': isNarrow() || isCoarse() ? '16px' : '13px',
    padding: '10px 12px',
    border: 'none',
    'border-bottom': '1px solid var(--color-border, #333)',
    background: 'transparent',
    color: 'var(--mol-color-text, currentColor)',
    outline: 'none',
    'box-sizing': 'border-box',
    'flex-shrink': '0',
  })
  const listStyle = (): Record<string, string | undefined> => ({
    // On narrow viewports the flex-column container's dvh cap governs instead
    // of a fixed pixel height — the list shrinks to whatever fits above the
    // on-screen keyboard.
    'max-height': isNarrow() ? undefined : '300px',
    'min-height': '0px',
    overflow: 'auto',
  })
  const stateStyle = (): Record<string, string> => ({
    padding: '12px',
    'font-size': '12px',
    color: 'var(--mol-color-text-secondary, #888)',
    'text-align': 'center',
  })
  const rowStyle = (i: number): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    width: '100%',
    padding: '6px 12px',
    border: 'none',
    background: i === selectedIndex() ? selectedBg() : 'transparent',
    color: 'var(--mol-color-text, currentColor)',
    cursor: 'pointer',
    'font-size': '13px',
    'text-align': 'left',
  })
  const labelStyle = (): Record<string, string> => ({
    flex: '1',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap',
  })
  const detailStyle = (): Record<string, string> => ({
    'font-size': '11px',
    color: 'var(--mol-color-text-secondary, #888)',
    'flex-shrink': '0',
  })

  return (
    <>
      {/* Backdrop — role="presentation": a sibling click-away surface that
          receives only its own clicks; Escape dismisses through the picker's
          key handler. */}
      <div role="presentation" onClick={props.onDismiss} style={backdropStyle()} />
      {/* Picker — centered on desktop; anchored near the TOP on phone-width
          viewports (the picker autofocuses its input, so the on-screen keyboard
          appears immediately — a vertically-centered box would sit under it).
          The dvh cap keeps the results visible above the keyboard when the
          browser resizes the viewport (interactive-widget=resizes-content).
          The picker is a modal dialog: role="dialog" + aria-modal name it to
          assistive tech. Its keyboard navigation rides the picker's own
          interactive descendants (the input and the rows) — the WAI-ARIA dialog
          keeps the keys inside the dialog, and attaching them to the focused
          controls keeps them there without giving the container, which holds
          controls, an interaction role. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ide.quickPicker.label', undefined, { defaultValue: 'Quick picker' })}
        class={cm.cn(props.className)}
        style={panelStyle()}
      >
        <input
          ref={(el: HTMLInputElement) => {
            inputEl = el
          }}
          type="text"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            props.placeholder ??
            t('ide.quickPicker.placeholder', undefined, { defaultValue: 'Type to search…' })
          }
          style={inputStyle()}
        />
        <div
          ref={(el: HTMLDivElement) => {
            listEl = el
          }}
          style={listStyle()}
        >
          {props.loading ? (
            <div style={stateStyle()}>
              {t('ide.quickPicker.loading', undefined, { defaultValue: 'Loading…' })}
            </div>
          ) : list.keys().length === 0 ? (
            <div style={stateStyle()}>
              {t('ide.quickPicker.noResults', undefined, { defaultValue: 'No matching results' })}
            </div>
          ) : (
            <For each={list.keys()}>
              {(key) => {
                const index = createMemo(() => list.keys().indexOf(key))
                const item = createMemo(() => list.get(key)!)
                return (
                  <button
                    type="button"
                    data-mol-id={`quick-picker-item-${item().id}`}
                    onClick={() => props.onSelect(item())}
                    onKeyDown={handleKeyDown}
                    onMouseEnter={() => setSelectedIndex(index())}
                    class={cm.touchTargetCompact}
                    /* mol-bespoke-button: a picker ROW (icon + label + detail) with
                       keyboard-driven selection — a list item, not a CTA. Selected
                       tint is a theme token; the ≥36px coarse floor is the
                       ClassMap's (it was a hand-rolled `minHeight: 36`). */
                    style={rowStyle(index())}
                  >
                    {item().icon}
                    <span style={labelStyle()}>{item().label}</span>
                    {item().detail && <span style={detailStyle()}>{item().detail}</span>}
                  </button>
                )
              }}
            </For>
          )}
        </div>
      </div>
    </>
  )
}
