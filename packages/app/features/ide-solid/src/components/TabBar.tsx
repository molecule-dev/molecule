/**
 * Horizontal scrollable editor tab bar.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `TabBar` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Each tab shows the file's material icon,
 * its name colored by the highest-priority signal (diagnostics errors, then a
 * deleted status, then warnings, then git status), a dirty bullet, and a
 * hover- or focus-revealed close control (always visible and dimmed on
 * touch-first devices, where neither hover nor the focus reveal applies). A
 * diff tab delays its single click
 * past the double-click window so opening the diff survives the double click
 * that dismissed it — and its second click replaces the pending timer whose
 * leaked predecessor still fires (React's exact timer handling).
 *
 * Enter/leave is bound to `mouseover`/`mouseout` with a related-target check —
 * the boundary pair React derives `onMouseEnter`/`onMouseLeave` from — so a
 * crossing INTO a child (the close control) reads as staying, not leaving.
 * Focus/blur is bound to the bubbling `focusin`/`focusout` — the pair React's
 * synthetic `onFocus`/`onBlur` derive from — so the close control stays
 * revealed while focus is anywhere inside the tab (a keyboard user who tabs
 * to the tab sees what the mouse user sees on hover, WCAG 2.4.7), and the
 * close control's tint lights on its own focus too.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import { For, type JSX } from 'solid-js'
import { createEffect, createMemo, createSignal } from 'solid-js'

import type { TabBarProps } from '@molecule/app-ide-panel-logic'
import { useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'

// ---------------------------------------------------------------------------
// Status colors — dark/light variants for readability
// ---------------------------------------------------------------------------

/** Dark-theme filename colors by git status. */
const DARK_STATUS_COLORS: Record<string, string> = {
  modified: '#e2c08d',
  added: '#73c991',
  untracked: '#73c991',
  deleted: '#c74e39',
}

/** Light-theme filename colors by git status. */
const LIGHT_STATUS_COLORS: Record<string, string> = {
  modified: '#8a6010',
  added: '#1a7030',
  untracked: '#1a7030',
  deleted: '#a03020',
}

/** Dark-theme filename colors by diagnostic severity. */
const DARK_DIAGNOSTIC: Record<string, string> = {
  error: '#f14c4c',
  deleted: '#c74e39',
  warning: '#cca700',
}

/** Light-theme filename colors by diagnostic severity. */
const LIGHT_DIAGNOSTIC: Record<string, string> = {
  error: '#c02020',
  deleted: '#a03020',
  warning: '#806000',
}

/**
 * Resolve filename color based on diagnostics (highest priority) then git status.
 * @param statusColors - Map of git status names to CSS color values.
 * @param diagnosticColors - Map of diagnostic severity to CSS color values.
 * @param diagnostics - Diagnostic counts for the file.
 * @param diagnostics.errors - Number of error-level diagnostics.
 * @param diagnostics.warnings - Number of warning-level diagnostics.
 * @param gitStatus - The git status string (e.g. "modified", "added").
 * @returns The resolved CSS color string, or undefined for default color.
 */
function resolveFileColor(
  statusColors: Record<string, string>,
  diagnosticColors: Record<string, string>,
  diagnostics?: { errors: number; warnings: number },
  gitStatus?: string,
): string | undefined {
  if (diagnostics?.errors) return diagnosticColors.error
  if (gitStatus === 'deleted') return diagnosticColors.deleted
  if (diagnostics?.warnings) return diagnosticColors.warning
  if (gitStatus) return statusColors[gitStatus]
  return undefined
}

/** Props for a single editor tab — React's {@link TabItemProps}. */
export interface TabItemProps {
  /** The tab's file path. */
  path: string
  /** Whether the file has unsaved changes (a bullet after the name). */
  isDirty?: boolean
  /** Whether this tab is the active one. */
  isActive: boolean
  /** Whether this tab is a preview (the name is italic). */
  isPreview?: boolean
  /** Whether this tab shows a diff (the single click is delayed). */
  isDiff?: boolean
  /** The file's git status (e.g. "modified", "deleted"). */
  gitStatus?: string
  /** Diagnostic counts for the file. */
  diagnostics?: { errors: number; warnings: number }
  /** Selects the tab. */
  onSelect: (path: string) => void
  /** Closes the tab. */
  onClose: (path: string) => void
  /** Double-clicks the tab (pinning a preview). */
  onDoubleClick?: (path: string) => void
  /** Filename colors by git status for the active theme. */
  statusColors: Record<string, string>
  /** Filename colors by diagnostic severity for the active theme. */
  diagnosticColors: Record<string, string>
  /** Touch-first device — taller tab (40px) + larger, always-visible close target. */
  isCoarse: boolean
}

/**
 * A React-keyed view of a list: the keys to iterate and the latest item per
 * key. Solid's `For` keys by object identity, so the bar iterates the KEYS
 * (`For` compares strings by value, so an unchanged key keeps its DOM node and
 * moves it on a reorder) and reads each item through `get`, which returns the
 * latest item for that key so the rendered content still updates reactively.
 *
 * @template T - The list's item type.
 * @template K - The key type.
 * @param items - The list, as a reactive accessor.
 * @param keyOf - The key React assigns each item (`key={…}`).
 * @returns The keys to iterate and the item lookup to read.
 */
function createKeyedList<T, K extends string>(
  items: () => T[],
  keyOf: (item: T) => K,
): { keys: () => K[]; get: (key: K) => T | undefined } {
  const keys = createMemo(() => items().map((item) => keyOf(item)))
  const byKey = createMemo(() => {
    const latest = new Map<K, T>()
    items().forEach((item) => latest.set(keyOf(item), item))
    return latest
  })
  return { keys, get: (key) => byKey().get(key) }
}

/**
 * Individual tab item with hover-gated close button and status coloring.
 * Internal to the bar (React renders it internally too).
 *
 * @param props - See {@link TabItemProps}.
 * @returns The rendered tab item element.
 */
function TabItem(props: TabItemProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = createSignal(false)
  // Whether the close control stays revealed because focus is inside the tab
  // (React's `closeRevealed` state).
  const [closeRevealed, setCloseRevealed] = createSignal(false)
  // Whether the pointer is over the close control itself, or the control has
  // keyboard focus — either lights its tint. React writes the highlight
  // straight onto the element and its re-render (diffing the last vnode)
  // leaves such a write alone; this tab renders the highlight from state
  // instead — the DOM is identical after every step.
  const [isCloseHovered, setIsCloseHovered] = createSignal(false)
  const [isCloseFocused, setIsCloseFocused] = createSignal(false)
  // For diff tabs, suppress the single-click during a double-click so that
  // setActiveTab (which destroys the diff) doesn't fire before onDoubleClick.
  // A plain cell, React's `clickTimerRef`: a second click replaces it without
  // clearing, and the timer itself nulls it when it fires — so a timer armed
  // between two clicks still leaks through.
  let clickTimer: ReturnType<typeof setTimeout> | null = null

  const fileName = (): string => props.path.split('/').pop() || props.path
  const fileColor = (): string | undefined =>
    resolveFileColor(props.statusColors, props.diagnosticColors, props.diagnostics, props.gitStatus)

  /**
   * The single click: immediate, unless this is a diff tab — then it waits
   * out the double-click window.
   */
  const handleClick = (): void => {
    if (!props.isDiff) {
      props.onSelect(props.path)
      return
    }
    // Delay single-click; cancel if double-click fires first.
    clickTimer = setTimeout(() => {
      clickTimer = null
      props.onSelect(props.path)
    }, 250)
  }

  /**
   * The double click: a diff tab cancels the pending single click first.
   */
  const handleDoubleClick = (): void => {
    if (props.isDiff && clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    props.onDoubleClick?.(props.path)
  }

  /**
   * The tab's boundary hover: a `mouseover` whose pointer came from inside
   * the tab (a crossing into the close control) is not an enter.
   *
   * @param event - The native hover event.
   */
  const onOver = (event: MouseEvent): void => {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setIsHovered(true)
  }

  /**
   * The tab's boundary leave: a `mouseout` whose pointer stayed inside the
   * tab (a crossing into the close control) is not a leave.
   *
   * @param event - The native hover event.
   */
  const onOut = (event: MouseEvent): void => {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setIsHovered(false)
  }

  /**
   * The tab's focus reveal: any focus landing inside the tab — the tab itself
   * or its close control, `focusin` bubbles — shows the control.
   */
  const onFocusIn = (): void => {
    setCloseRevealed(true)
  }

  /**
   * The tab's focus leave: a `focusout` whose next focus target stayed inside
   * the tab (the move to the close control) is not a leave.
   *
   * @param event - The native focus event.
   */
  const onFocusOut = (event: FocusEvent): void => {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setCloseRevealed(false)
  }

  /**
   * The close control's hover: a `mouseover` whose pointer came from inside
   * the control is not an enter.
   *
   * @param event - The native hover event.
   */
  const closeOver = (event: MouseEvent): void => {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setIsCloseHovered(true)
  }

  /**
   * The close control's hover end.
   *
   * @param event - The native hover event.
   */
  const closeOut = (event: MouseEvent): void => {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    setIsCloseHovered(false)
  }

  /**
   * The close control's focus tint, the keyboard twin of its hover tint.
   */
  const closeFocusIn = (): void => {
    setIsCloseFocused(true)
  }

  /**
   * The close control's focus tint end.
   */
  const closeFocusOut = (): void => {
    setIsCloseFocused(false)
  }

  return (
    <div
      // The presentation wrapper owns the mouse behaviour and the tab's
      // geometry; the `role="tab"` inside it carries the ARIA state and the
      // keyboard path, and the close control is its sibling (a tab's children
      // are presentational — axe `nested-interactive`).
      role="presentation"
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      onMouseOver={onOver}
      onMouseOut={onOut}
      onfocusin={onFocusIn}
      onfocusout={onFocusOut}
      // 40px tall on touch-first devices — the WCAG-acceptable floor for a dense
      // toolbar row; 32px compact height on pointer devices (unchanged).
      style={{ 'user-select': 'none', height: props.isCoarse ? '40px' : '32px' }}
      class={cm.cn(
        cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.textSize('sm'),
        cm.shrink0,
        cm.cursorPointer,
        cm.borderR,
        props.isActive && cm.surface,
        props.isActive && cm.borderBPrimary,
      )}
    >
      <div
        role="tab"
        title={props.path}
        tabindex={0}
        aria-selected={props.isActive ? 'true' : 'false'}
        // The close action's keyboard path (Delete), announced so it is
        // discoverable.
        aria-keyshortcuts="Delete"
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') props.onSelect(props.path)
          // The close control is a sibling, so Delete closes the tab.
          else if (event.key === 'Delete') props.onClose(props.path)
        }}
        class={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))}
      >
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            'flex-shrink': 0,
            'vertical-align': 'middle',
          }}
          innerHTML={getIcon(fileName()).svg}
        />
        <span
          style={{
            'font-style': props.isPreview ? 'italic' : undefined,
            color: fileColor(),
            'text-decoration': props.gitStatus === 'deleted' ? 'line-through' : undefined,
          }}
        >
          {fileName()}
          {props.isDirty && <span class={cm.textWarning}>{' •'}</span>}
        </span>
      </div>
      <button
        type="button"
        data-mol-id="tab-close"
        tabindex={-1}
        // The pointer-user duplicate of the tab's Delete action; hidden from
        // the accessibility tree because a tablist may own only tabs (axe
        // `aria-required-children`).
        aria-hidden="true"
        onClick={(event: MouseEvent): void => {
          event.stopPropagation()
          props.onClose(props.path)
        }}
        onMouseOver={closeOver}
        onMouseOut={closeOut}
        onfocusin={closeFocusIn}
        onfocusout={closeFocusOut}
        class={cm.cn(cm.textMuted, cm.textSize('xs'), cm.cursorPointer, cm.touchTargetCompact)}
        /* mol-bespoke-button: icon-only ✕ tab close, hover-revealed, 16px
           square so the mark sits dead-centre in a 32px tab. Its hit floor is
           the ClassMap's 36px (min-width/height beat the 16px width/height
           below) — it used to be a bespoke 32px. */
        style={{
          // Square button (equal width/height) with the glyph centered on both
          // axes — no asymmetric padding, so the ✕ sits dead-center in the tab.
          // On touch-first devices neither hover nor the focus reveal applies,
          // so the close is also always visible, dimmed.
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'flex-shrink': 0,
          width: '16px',
          height: '16px',
          border: 'none',
          padding: 0,
          background:
            isCloseHovered() || isCloseFocused() ? 'rgba(128,128,128,0.25)' : 'transparent',
          color:
            isCloseHovered() || isCloseFocused() ? 'var(--color-foreground, #e0e0e0)' : undefined,
          'line-height': 1,
          'border-radius': '3px',
          'margin-left': '4px',
          'margin-right': props.isCoarse ? '-8px' : '-4px',
          opacity: isHovered() || closeRevealed() ? 1 : props.isCoarse ? 0.6 : 0,
          transition: 'opacity 100ms, background 80ms, color 80ms',
        }}
        aria-label={t(
          'ide.tabs.close',
          { fileName: fileName() },
          { defaultValue: 'Close {{fileName}}' },
        )}
      >
        {/* SVG X (not a text ✕ glyph, whose font metrics never center cleanly) so the
            mark sits dead-center in the square button — matches the tip/skill dismiss X. */}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * Horizontally scrollable tab bar for open editor files.
 *
 * @param props - See {@link TabBarProps}.
 * @returns The rendered tab bar element, or null if no tabs are open.
 */
export function TabBar(props: TabBarProps): JSX.Element | null {
  const cm = getClassMap()
  const mode = useThemeMode()
  const isCoarse = useCoarsePointer()
  let scrollRef: HTMLDivElement | undefined

  // Scroll the active tab into view whenever it changes
  createEffect(() => {
    const activeFile = props.activeFile
    const el = scrollRef
    if (!el || !activeFile) return
    const tab = el.querySelector('[aria-selected="true"]') as HTMLElement | null
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  })

  // React keys each tab by its path, so a re-passed or re-ordered `tabs` prop
  // keeps every tab's DOM node; the bar iterates the keys and reads the latest
  // tab through the lookup.
  const list = createKeyedList(
    () => props.tabs,
    (tab): string => tab.path,
  )

  // React returns null while no tabs are open.
  const visible = createMemo(() => props.tabs.length > 0)

  return (
    <>
      {visible() ? (
        <div class={cm.cn(cm.shrink0, cm.surfaceSecondary, cm.borderB, props.className)}>
          <div
            ref={(node: HTMLDivElement) => {
              scrollRef = node
            }}
            class={cm.flex({ direction: 'row', align: 'center' })}
            style={{
              'overflow-x': 'auto',
              'scrollbar-width': 'none',
              height: isCoarse() ? '40px' : '32px',
              // Momentum scrolling on legacy iOS; keep a horizontal fling on the tab
              // strip from turning into browser back/forward navigation.
              '-webkit-overflow-scrolling': 'touch',
              'overscroll-behavior-x': 'contain',
            }}
            role="tablist"
          >
            <For each={list.keys()}>
              {(tabKey): JSX.Element => {
                const item = (): TabBarProps['tabs'][number] => list.get(tabKey)!
                return (
                  <TabItem
                    path={item().path}
                    isDirty={item().isDirty}
                    isActive={item().path === props.activeFile}
                    isPreview={item().isPreview}
                    isDiff={item().isDiff}
                    gitStatus={props.fileStatuses?.[item().path]}
                    // Diff tabs show historical content — error/warning coloring from the
                    // live file's diagnostics would misread as "the diff has errors".
                    diagnostics={item().isDiff ? undefined : item().diagnostics}
                    onSelect={props.onSelect}
                    onClose={props.onClose}
                    onDoubleClick={props.onDoubleClick}
                    statusColors={mode() === 'light' ? LIGHT_STATUS_COLORS : DARK_STATUS_COLORS}
                    diagnosticColors={mode() === 'light' ? LIGHT_DIAGNOSTIC : DARK_DIAGNOSTIC}
                    isCoarse={isCoarse()}
                  />
                )
              }}
            </For>
          </div>
        </div>
      ) : null}
    </>
  )
}
