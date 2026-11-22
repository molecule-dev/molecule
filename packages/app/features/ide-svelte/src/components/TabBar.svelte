<!--
  TabBar: the Svelte counterpart of `@molecule/app-ide-react`'s `TabBar` —
  the editor's horizontal, scrollable tab strip. Same props (React names),
  same DOM for the same input, same callbacks. Each tab shows the file's
  material icon, its name colored by the highest-priority signal
  (diagnostics errors, then a deleted status, then warnings, then git
  status), a dirty bullet, and a hover- or focus-revealed close control
  (always visible and dimmed on touch-first devices, where neither hover nor
  the focus reveal applies). A diff tab
  delays its single click past the double-click window so opening the diff
  survives the double click that dismissed it — and its second click replaces
  the pending timer whose leaked predecessor still fires (React's exact timer
  handling, kept per tab path — React holds one per tab instance, and a path
  is one instance).

  Enter/leave is bound to `mouseover`/`mouseout` with a related-target check —
  the boundary pair React derives `onMouseEnter`/`onMouseLeave` from — so a
  crossing INTO a child (the close control) reads as staying, not leaving.
  Focus/blur is bound to the bubbling `focusin`/`focusout` — the pair React's
  synthetic `onFocus`/`onBlur` derive from — so the close control stays
  revealed while focus is anywhere inside the tab (a keyboard user who tabs
  to the tab sees what the mouse user sees on hover, WCAG 2.4.7), and the
  close control's tint lights on its own focus too.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import { getIcon } from 'material-file-icons'
  import { SvelteMap } from 'svelte/reactivity'

  import type { EditorTab } from '@molecule/app-code-editor'
  import type { TabBarProps } from '@molecule/app-ide-panel-logic'
  import { useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap, type UIClassMap } from '@molecule/app-ui'

  import { useCoarsePointer } from '../hooks/useViewport.js'
  import Markup from '../parts/Markup.svelte'

  // Status colors — dark/light variants for readability

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

  /** Props for a single editor tab — React's `TabItemProps`. */
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
   * The tab's file name: everything after the last slash, or the whole path
   * when there is none.
   * @param tab - The tab.
   * @returns The file name.
   */
  function fileName(tab: EditorTab): string {
    return tab.path.split('/').pop() || tab.path
  }

  /**
   * The tab's filename color (see {@link resolveFileColor}). Diff tabs ignore
   * the live diagnostics — see the React file.
   * @param tab - The tab.
   * @param statusColors - Filename colors by git status for the active theme.
   * @param diagnosticColors - Filename colors by diagnostic severity.
   * @param gitStatus - The file's git status from the `fileStatuses` prop.
   * @returns The resolved color, or undefined for the default.
   */
  function fileColor(
    tab: EditorTab,
    statusColors: Record<string, string>,
    diagnosticColors: Record<string, string>,
    gitStatus: string | undefined,
  ): string | undefined {
    return resolveFileColor(
      statusColors,
      diagnosticColors,
      tab.isDiff ? undefined : tab.diagnostics,
      gitStatus,
    )
  }

  /**
   * Applies inline styles one property at a time (the way React writes each
   * one), keeping them current when the record changes. The close control's
   * style takes this path because its `transition` value names `background`
   * and `color` — jsdom's cssText parser drops a sibling `background`
   * declaration that shares an attribute text with such a `transition`
   * shorthand, while React's per-property writes are immune.
   * @param node - The host element.
   * @param styles - The declarations to keep applied.
   * @returns The action's update hook.
   */
  const inlineStyles = (
    node: HTMLElement,
    styles: Record<string, string | undefined>,
  ): { update: (next: Record<string, string | undefined>) => void } => {
    /**
     * Applies one record of declarations.
     * @param next - The declarations.
     */
    const apply = (next: Record<string, string | undefined>): void => {
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined) node.style.removeProperty(key)
        else node.style.setProperty(key, value)
      }
    }
    apply(styles)
    return {
      /**
       * Applies the next record of declarations.
       * @param next - The declarations.
       */
      update(next: Record<string, string | undefined>): void {
        apply(next)
      },
    }
  }
</script>

<script lang="ts">
  let { tabs, activeFile, onSelect, onClose, onDoubleClick, fileStatuses, className }: TabBarProps =
    $props()

  const { t } = useTranslation()
  const mode = useThemeMode()
  const coarse = useCoarsePointer()

  const cm: UIClassMap = getClassMap()
  const isLight = $derived($mode === 'light')
  // The active theme's filename color tables (React picks them per render).
  const statusColors = $derived(isLight ? LIGHT_STATUS_COLORS : DARK_STATUS_COLORS)
  const diagnosticColors = $derived(isLight ? LIGHT_DIAGNOSTIC : DARK_DIAGNOSTIC)

  // Whether the pointer is over a tab (the close control reveals for it), the
  // close control itself (the highlight lights it), focus is inside a tab (the
  // control stays revealed — React's `closeRevealed`) or the close control has
  // keyboard focus (its tint lights — React's twin of its hover tint). React
  // holds one state per tab instance; a path is one instance, so per-path
  // records are the same state. React writes the close control's highlight
  // straight onto the element and its re-render (diffing the last vnode)
  // leaves such a write alone; these render it from state instead — the DOM
  // is identical after every step.
  let hovered = $state<Record<string, boolean>>({})
  let closeHovered = $state<Record<string, boolean>>({})
  let closeRevealed = $state<Record<string, boolean>>({})
  let closeFocused = $state<Record<string, boolean>>({})

  // The pending diff-tab single clicks, per tab path — React's `clickTimerRef`
  // (one per tab instance): a second click replaces it without clearing, and
  // the timer itself nulls it when it fires — so a timer armed between two
  // clicks still leaks through.
  const clickTimers = new SvelteMap<string, ReturnType<typeof setTimeout> | null>()

  let scrollEl: HTMLDivElement | null = $state(null)

  // Scroll the active tab into view whenever it changes
  $effect(() => {
    void activeFile
    const el = scrollEl
    if (!el || !activeFile) return
    const tab = el.querySelector('[aria-selected="true"]') as HTMLElement | null
    tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  })

  /**
   * The single click: immediate, unless this is a diff tab — then it waits
   * out the double-click window.
   * @param tab - The tab.
   */
  function handleClick(tab: EditorTab): void {
    if (!tab.isDiff) {
      onSelect(tab.path)
      return
    }
    // Delay single-click; cancel if double-click fires first.
    clickTimers.set(
      tab.path,
      setTimeout(() => {
        clickTimers.set(tab.path, null)
        onSelect(tab.path)
      }, 250),
    )
  }

  /**
   * The double click: a diff tab cancels the pending single click first.
   * @param tab - The tab.
   */
  function handleDoubleClick(tab: EditorTab): void {
    const timer = clickTimers.get(tab.path)
    if (tab.isDiff && timer) {
      clearTimeout(timer)
      clickTimers.set(tab.path, null)
    }
    onDoubleClick?.(tab.path)
  }

  /**
   * The tab's boundary hover: a `mouseover` whose pointer came from inside
   * the tab (a crossing into the close control) is not an enter.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  function tabOver(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    hovered[tab.path] = true
  }

  /**
   * The tab's boundary leave: a `mouseout` whose pointer stayed inside the
   * tab (a crossing into the close control) is not a leave.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  function tabOut(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    hovered[tab.path] = false
  }

  /**
   * The close control's hover: a `mouseover` whose pointer came from inside
   * the control is not an enter.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  function closeOver(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    closeHovered[tab.path] = true
  }

  /**
   * The close control's hover end.
   * @param tab - The tab.
   * @param event - The native hover event.
   */
  function closeOut(tab: EditorTab, event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    closeHovered[tab.path] = false
  }

  /**
   * The tab's focus reveal: any focus landing inside the tab — the tab itself
   * or its close control, `focusin` bubbles — shows the control.
   * @param tab - The tab.
   */
  function tabFocusIn(tab: EditorTab): void {
    closeRevealed[tab.path] = true
  }

  /**
   * The tab's focus leave: a `focusout` whose next focus target stayed inside
   * the tab (the move to the close control) is not a leave.
   * @param tab - The tab.
   * @param event - The native focus event.
   */
  function tabFocusOut(tab: EditorTab, event: FocusEvent): void {
    const el = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
    closeRevealed[tab.path] = false
  }

  /**
   * The close control's focus tint, the keyboard twin of its hover tint.
   * @param tab - The tab.
   */
  function closeFocusIn(tab: EditorTab): void {
    closeFocused[tab.path] = true
  }

  /**
   * The close control's focus tint end.
   * @param tab - The tab.
   */
  function closeFocusOut(tab: EditorTab): void {
    closeFocused[tab.path] = false
  }

  /**
   * The keyboard selection: Enter or Space selects the focused tab, Delete
   * closes it (the close control is a sibling of the tab, so the tab's Delete
   * key is the keyboard path to closing it).
   * @param tab - The tab.
   * @param event - The key press.
   */
  function handleKeyDown(tab: EditorTab, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') onSelect(tab.path)
    else if (event.key === 'Delete') onClose(tab.path)
  }
</script>

{#if tabs.length > 0}
  <div class={cm.cn(cm.shrink0, cm.surfaceSecondary, cm.borderB, className)}>
    <div
      bind:this={scrollEl}
      class={cm.flex({ direction: 'row', align: 'center' })}
      style="overflow-x: auto; scrollbar-width: none; height: {$coarse
        ? '40px'
        : '32px'}; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain"
      role="tablist"
    >
      {#each tabs as tab (tab.path)}
        {@const status = fileStatuses?.[tab.path]}
        <div
          role="presentation"
          onclick={() => handleClick(tab)}
          ondblclick={() => handleDoubleClick(tab)}
          onmouseover={(event) => tabOver(tab, event)}
          onmouseout={(event) => tabOut(tab, event)}
          onfocusin={() => tabFocusIn(tab)}
          onfocusout={(event) => tabFocusOut(tab, event)}
          style="user-select: none; height: {$coarse ? '40px' : '32px'}"
          class={cm.cn(
            cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.textSize('sm'),
            cm.shrink0,
            cm.cursorPointer,
            cm.borderR,
            tab.path === activeFile && cm.surface,
            tab.path === activeFile && cm.borderBPrimary,
          )}
        >
          <div
            role="tab"
            title={tab.path}
            tabindex="0"
            aria-selected={tab.path === activeFile ? 'true' : 'false'}
            aria-keyshortcuts="Delete"
            onkeydown={(event) => handleKeyDown(tab, event)}
            class={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))}
          >
            <span
              style="display: inline-block; width: 14px; height: 14px; flex-shrink: 0; vertical-align: middle"
              ><Markup markup={getIcon(fileName(tab)).svg} /></span
            >
            <span
              style:font-style={tab.isPreview ? 'italic' : undefined}
              style:color={fileColor(tab, statusColors, diagnosticColors, status)}
              style:text-decoration={status === 'deleted' ? 'line-through' : undefined}
            >
              {fileName(tab)}{#if tab.isDirty}<span class={cm.textWarning}> •</span>{/if}
            </span>
          </div>
          <button
            type="button"
            data-mol-id="tab-close"
            tabindex="-1"
            aria-hidden="true"
            onclick={(event) => {
              event.stopPropagation()
              onClose(tab.path)
            }}
            onmouseover={(event) => closeOver(tab, event)}
            onmouseout={(event) => closeOut(tab, event)}
            onfocusin={() => closeFocusIn(tab)}
            onfocusout={() => closeFocusOut(tab)}
            class={cm.cn(cm.textMuted, cm.textSize('xs'), cm.cursorPointer, cm.touchTargetCompact)}
            use:inlineStyles={{
              // Square button (equal width/height) with the glyph centered on both
              // axes — no asymmetric padding, so the ✕ sits dead-center in the tab.
              // On touch-first devices neither hover nor the focus reveal applies,
              // so the close is also always visible, dimmed.
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              'flex-shrink': '0',
              width: '16px',
              height: '16px',
              border: 'none',
              padding: '0px',
              background:
                closeHovered[tab.path] || closeFocused[tab.path]
                  ? 'rgba(128,128,128,0.25)'
                  : 'transparent',
              color:
                closeHovered[tab.path] || closeFocused[tab.path]
                  ? 'var(--color-foreground, #e0e0e0)'
                  : undefined,
              'line-height': '1',
              'border-radius': '3px',
              'margin-left': '4px',
              'margin-right': $coarse ? '-8px' : '-4px',
              opacity: hovered[tab.path] || closeRevealed[tab.path] ? '1' : $coarse ? '0.6' : '0',
              transition: 'opacity 100ms, background 80ms, color 80ms',
            }}
            aria-label={t(
              'ide.tabs.close',
              { fileName: fileName(tab) },
              {
                defaultValue: 'Close {{fileName}}',
              },
            )}
          >
            <!-- SVG X (not a text ✕ glyph, whose font metrics never center cleanly) so the
                mark sits dead-center in the square button — matches the tip/skill dismiss X. -->
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true"
              ><path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              ></path></svg
            >
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}
