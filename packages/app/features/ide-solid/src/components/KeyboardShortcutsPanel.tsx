/**
 * The IDE shortcut reference and its dialog-scoped keyboard navigation.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For } from 'solid-js'

import type { KeyboardShortcutsPanelProps, ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap, type KitKeyboardEvent, type OverlayTarget } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-solid'

/**
 * A React-keyed view of a list: the keys to iterate and the latest item per
 * key. Solid's `For` keys by object identity, so the panel iterates the KEYS
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

/** One category's rows and the flat index its first row holds. */
interface ShortcutGroup {
  /** The category name (`''` for the uncategorized rows). */
  category: string
  /** The rows in that category, in prop order. */
  entries: ShortcutEntry[]
  /** The flat index of the group's first row (React's render counter). */
  start: number
}

/**
 * Groups shortcuts by category, preserving insertion order, and records the
 * flat index each group's first row renders at.
 *
 * @param shortcuts - Flat list of shortcut entries.
 * @returns The groups, in first-occurrence order, with their flat offsets.
 */
function groupByCategory(shortcuts: ShortcutEntry[]): ShortcutGroup[] {
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
  const out: ShortcutGroup[] = []
  let start = 0
  for (const [category, entries] of groups) {
    out.push({ category, entries, start })
    start += entries.length
  }
  return out
}

/**
 * Keyboard shortcuts reference panel.
 *
 * @param props - See {@link KeyboardShortcutsPanelProps}.
 * @returns The rendered keyboard shortcuts panel.
 */
export function KeyboardShortcutsPanel(props: KeyboardShortcutsPanelProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  let dialog: HTMLDivElement | undefined
  const dialogTarget: OverlayTarget = {
    get current() {
      return dialog ?? null
    },
  }
  const [listEl, setListEl] = createSignal<HTMLDivElement>()

  // The rows grouped by category, in first-occurrence order, with their flat
  // offsets — and the flat list for keyboard navigation indexing.
  const groups = createMemo(() => groupByCategory(props.shortcuts))
  const flatEntries = createMemo(() => groups().flatMap((group) => group.entries))

  // React keys each group by its category and each row by its entry label, so
  // a re-passed or re-ordered `shortcuts` prop keeps every rendered node; the
  // panel iterates the keys and reads the latest value through the lookup.
  const list = createKeyedList(groups, (group): string => group.category)

  // Scroll selected item into view
  createEffect(() => {
    const buttons = listEl()?.querySelectorAll('[data-shortcut-row]')
    const el = buttons?.[selectedIndex()] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })

  // The selected-row tint follows the theme primary (so a rebranded app tints
  // its own picker), never a literal blue; the hex is only the CSS-var fallback.
  const selectedBg = createMemo(() =>
    mode() === 'light'
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)',
  )

  /**
   * The keyboard navigation: the arrows move the highlight over the flat
   * row order (clamped), Enter runs the highlighted row when it has a
   * handler. The dialog owns Escape.
   *
   * @param e - The key press.
   */
  function handleKeyDown(e: KitKeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex() + 1, flatEntries().length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex() - 1, 0))
        break
      case 'Enter': {
        e.preventDefault()
        const entry = flatEntries()[selectedIndex()]
        if (entry?.execute) {
          entry.execute()
          props.onDismiss()
        }
        break
      }
    }
  }

  // The style objects come from function CALLS, not inline literals: the
  // Solid JSX transform compiles an inline style object into one raw `style`
  // attribute string, whose one-shot parse loses shorthand declarations
  // React writes through the CSSOM (a `border: none` re-serialization, a
  // `flex: 1` expansion, an `rgba()` re-spacing). A call keeps the binding
  // live, so each declaration is applied through `setProperty` the way React
  // writes them.
  /** The header's style. */
  const headerStyle = (): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '14px 16px 10px',
    'border-bottom': '1px solid var(--color-border, #333)',
    'flex-shrink': '0',
  })
  /** The title's style. */
  const titleStyle = (): Record<string, string | number> => ({
    'font-size': '14px',
    'font-weight': 600,
  })
  /** The close ✕'s static style; hover tints it through the DOM, not here. */
  const closeStyle = (): Record<string, string> => ({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '18px',
    height: '18px',
    'border-radius': '4px',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    opacity: '0.6',
    transition: 'opacity 100ms, background 100ms',
  })
  /** The shortcut list's style. */
  const listStyle = (): Record<string, string> => ({
    flex: '1',
    overflow: 'auto',
    padding: '8px 0px',
  })
  /** A category header's style. */
  const categoryStyle = (): Record<string, string | number> => ({
    padding: '8px 16px 4px',
    'font-size': '11px',
    'font-weight': 600,
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    color: 'var(--mol-color-text-secondary, #888)',
  })
  /**
   * A row's style: flex row of label and key badges; the selected row carries
   * the theme tint, the others stay transparent, and a row without a handler
   * reads as text (`cursor: default`), not as a control.
   *
   * @param idx - The row's flat index.
   * @param executable - Whether the row's entry has an `execute` handler.
   * @returns The style object.
   */
  const rowStyle = (idx: number, executable: boolean): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '6px 16px',
    'font-size': '13px',
    width: '100%',
    border: 'none',
    background: idx === selectedIndex() ? selectedBg() : 'transparent',
    color: 'var(--mol-color-text, currentColor)',
    cursor: executable ? 'pointer' : 'default',
    'text-align': 'left',
    'border-radius': '0px',
  })
  /** The key-badge list's style (a flex row of badges after the label). */
  const keysStyle = (): Record<string, string> => ({
    display: 'flex',
    gap: '4px',
    'flex-shrink': '0',
    'margin-left': '16px',
  })
  /**
   * The badge's inline style for a theme (React's `KeyBadge` `kbd`).
   *
   * @param light - Whether the light theme is active.
   * @returns The style object.
   */
  const badgeStyle = (light: boolean): Record<string, string> => ({
    display: 'inline-block',
    padding: '2px 6px',
    'font-size': '11px',
    'font-family': 'system-ui, sans-serif',
    'line-height': '16px',
    'border-radius': '4px',
    border: `1px solid ${light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
    background: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
    color: 'var(--mol-color-text, currentColor)',
    'min-width': '20px',
    'text-align': 'center',
  })
  /** The footer hint's style. */
  const footerStyle = (): Record<string, string> => ({
    padding: '8px 16px',
    'border-top': '1px solid var(--color-border, #333)',
    'font-size': '11px',
    color: 'var(--mol-color-text-secondary, #888)',
    'text-align': 'center',
    'flex-shrink': '0',
  })

  return (
    <Modal
      open
      onClose={props.onDismiss}
      ref={(element) => {
        dialog = element
      }}
      initialFocus={dialogTarget}
      onKeyDown={handleKeyDown}
      showCloseButton={false}
      aria-label={t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' })}
      style={{ maxHeight: '70vh' }}
    >
      {/* Header */}
      <div style={headerStyle()}>
        <span style={titleStyle()}>
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
          onClick={props.onDismiss}
          aria-label={t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })}
          title={t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })}
          class={cm.cn(cm.touchTarget, cm.shrink0)}
          style={closeStyle()}
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
              stroke-width={1.6}
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Shortcut list */}
      <div ref={setListEl} style={listStyle()}>
        <For each={list.keys()}>
          {(category) => {
            const group = createMemo(() => list.get(category)!)
            const rows = createKeyedList(
              () => group().entries,
              (entry): string => entry.label,
            )
            return (
              <div>
                {group().category && <div style={categoryStyle()}>{group().category}</div>}
                <For each={rows.keys()}>
                  {(key) => {
                    const entry = createMemo(() => rows.get(key)!)
                    const rowIndex = createMemo(() => rows.keys().indexOf(key))
                    // The row's flat index: the group's first row plus the
                    // row's position in its group.
                    const idx = (): number => group().start + rowIndex()
                    return (
                      <button
                        type="button"
                        data-shortcut-row="true"
                        data-mol-id={`shortcut-row-${String(idx())}`}
                        onClick={() => {
                          const current = entry()
                          if (current.execute) {
                            current.execute()
                            props.onDismiss()
                          }
                        }}
                        onMouseEnter={() => setSelectedIndex(idx())}
                        class={cm.touchTargetCompact}
                        /* mol-bespoke-button: a shortcut-list ROW (label + key
                           badges) with keyboard-driven selection — a list item, not
                           a CTA. Its selected tint is a theme token and its 36px
                           coarse floor comes from the ClassMap. */
                        style={rowStyle(idx(), !!entry().execute)}
                      >
                        <span>{entry().label}</span>
                        <span style={keysStyle()}>
                          <For each={entry().keys.split(' ')}>
                            {(part): JSX.Element => (
                              <kbd style={badgeStyle(mode() === 'light')}>{part}</kbd>
                            )}
                          </For>
                        </span>
                      </button>
                    )
                  }}
                </For>
              </div>
            )
          }}
        </For>
      </div>

      {/* Footer hint */}
      <div style={footerStyle()}>
        {t('ide.shortcuts.hint', undefined, {
          defaultValue: 'Arrow keys to navigate · Enter to run · Esc to close',
        })}
      </div>
    </Modal>
  )
}
