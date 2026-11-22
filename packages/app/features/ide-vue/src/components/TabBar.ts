/**
 * Horizontal scrollable editor tab bar.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `TabBar` (see that file for
 * the design notes): the same props (React names), the same DOM for the same
 * input, the same callbacks. Each tab shows the file's material icon, its
 * name colored by the highest-priority signal (diagnostics errors, then a
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
import {
  computed,
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watchPostEffect,
} from 'vue'

import type { TabBarProps } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useThemeMode, useTranslation } from '@molecule/app-vue'

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
 * Individual tab item with hover-gated close button and status coloring.
 */
const TabItem = defineComponent({
  name: 'TabItem',
  inheritAttrs: false,
  props: {
    /** The tab's file path. */
    path: { type: String, required: true },
    /** Whether the file has unsaved changes (a bullet after the name). */
    isDirty: { type: Boolean, required: false, default: undefined },
    /** Whether this tab is the active one. */
    isActive: { type: Boolean, required: true },
    /** Whether this tab is a preview (the name is italic). */
    isPreview: { type: Boolean, required: false, default: undefined },
    /** Whether this tab shows a diff (the single click is delayed). */
    isDiff: { type: Boolean, required: false, default: undefined },
    /** The file's git status (e.g. "modified", "deleted"). */
    gitStatus: { type: String, required: false, default: undefined },
    /** Diagnostic counts for the file. */
    diagnostics: {
      type: Object as PropType<{ errors: number; warnings: number }>,
      required: false,
      default: undefined,
    },
    /** Selects the tab. */
    onSelect: { type: Function as PropType<TabItemProps['onSelect']>, required: true },
    /** Closes the tab. */
    onClose: { type: Function as PropType<TabItemProps['onClose']>, required: true },
    /** Double-clicks the tab (pinning a preview). */
    onDoubleClick: {
      type: Function as PropType<TabItemProps['onDoubleClick']>,
      required: false,
      default: undefined,
    },
    /** Filename colors by git status for the active theme. */
    statusColors: { type: Object as PropType<Record<string, string>>, required: true },
    /** Filename colors by diagnostic severity for the active theme. */
    diagnosticColors: { type: Object as PropType<Record<string, string>>, required: true },
    /** Touch-first device — taller tab, always-visible close target. */
    isCoarse: { type: Boolean, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const isHovered = ref(false)
    // Whether the close control stays revealed because focus is inside the
    // tab (React's `closeRevealed` state).
    const closeRevealed = ref(false)
    // Whether the pointer is over the close control itself, or the control has
    // keyboard focus — either lights its tint. React writes the highlight
    // straight onto the element and its re-render (diffing the last vnode)
    // leaves such a write alone; Vue's render reapplies every style key, so
    // the same highlight is render state here — the DOM is identical after
    // every step.
    const isCloseHovered = ref(false)
    const isCloseFocused = ref(false)
    // For diff tabs, suppress the single-click during a double-click so that
    // setActiveTab (which destroys the diff) doesn't fire before onDoubleClick.
    // A plain (non-reactive) cell, React's `clickTimerRef`: a second click
    // replaces it without clearing, and the timer itself nulls it when it
    // fires — so a timer armed between two clicks still leaks through.
    let clickTimer: ReturnType<typeof setTimeout> | null = null

    /**
     * The tab's boundary hover: a `mouseover` whose pointer came from inside
     * the tab (a crossing into the close control) is not an enter.
     *
     * @param event - The native hover event.
     */
    const onOver = (event: MouseEvent): void => {
      const el = event.currentTarget as HTMLElement
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
      isHovered.value = true
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
      isHovered.value = false
    }

    /**
     * The tab's focus reveal: any focus landing inside the tab — the tab
     * itself or its close control, `focusin` bubbles — shows the control.
     */
    const onFocusIn = (): void => {
      closeRevealed.value = true
    }

    /**
     * The tab's focus leave: a `focusout` whose next focus target stayed
     * inside the tab (the move to the close control) is not a leave.
     *
     * @param event - The native focus event.
     */
    const onFocusOut = (event: FocusEvent): void => {
      const el = event.currentTarget as HTMLElement
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
      closeRevealed.value = false
    }

    return (): VNode => {
      const fileName = props.path.split('/').pop() || props.path
      const fileColor = resolveFileColor(
        props.statusColors,
        props.diagnosticColors,
        props.diagnostics,
        props.gitStatus,
      )

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
       * The close control's hover: a `mouseover` whose pointer came from
       * inside the control is not an enter.
       *
       * @param event - The native hover event.
       */
      const closeOver = (event: MouseEvent): void => {
        const el = event.currentTarget as HTMLElement
        if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
        isCloseHovered.value = true
      }

      /**
       * The close control's hover end.
       *
       * @param event - The native hover event.
       */
      const closeOut = (event: MouseEvent): void => {
        const el = event.currentTarget as HTMLElement
        if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return
        isCloseHovered.value = false
      }

      /**
       * The close control's focus tint, the keyboard twin of its hover tint.
       */
      const closeFocusIn = (): void => {
        isCloseFocused.value = true
      }

      /**
       * The close control's focus tint end.
       */
      const closeFocusOut = (): void => {
        isCloseFocused.value = false
      }

      return h(
        'div',
        {
          // The presentation wrapper owns the mouse behaviour and the tab's
          // geometry; the `role="tab"` inside it carries the ARIA state and the
          // keyboard path, and the close control is its sibling (a tab's
          // children are presentational — axe `nested-interactive`).
          role: 'presentation',
          onClick: handleClick,
          onDblclick: handleDoubleClick,
          onMouseover: onOver,
          onMouseout: onOut,
          onFocusin: onFocusIn,
          onFocusout: onFocusOut,
          // 40px tall on touch-first devices — the WCAG-acceptable floor for a dense
          // toolbar row; 32px compact height on pointer devices (unchanged).
          style: { userSelect: 'none', height: props.isCoarse ? '40px' : '32px' },
          class: cm.cn(
            cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.textSize('sm'),
            cm.shrink0,
            cm.cursorPointer,
            cm.borderR,
            props.isActive && cm.surface,
            props.isActive && cm.borderBPrimary,
          ),
        },
        [
          h(
            'div',
            {
              role: 'tab',
              title: props.path,
              tabindex: 0,
              'aria-selected': props.isActive ? 'true' : 'false',
              // The close action's keyboard path (Delete), announced so it is
              // discoverable.
              'aria-keyshortcuts': 'Delete',
              onKeydown: (event: KeyboardEvent): void => {
                if (event.key === 'Enter' || event.key === ' ') props.onSelect(props.path)
                // The close control is a sibling, so Delete closes the tab.
                else if (event.key === 'Delete') props.onClose(props.path)
              },
              class: cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' })),
            },
            [
              h('span', {
                style: {
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  flexShrink: 0,
                  verticalAlign: 'middle',
                },
                innerHTML: getIcon(fileName).svg,
              }),
              h(
                'span',
                {
                  style: {
                    fontStyle: props.isPreview ? 'italic' : undefined,
                    color: fileColor,
                    textDecoration: props.gitStatus === 'deleted' ? 'line-through' : undefined,
                  },
                },
                [fileName, props.isDirty ? h('span', { class: cm.textWarning }, [' •']) : null],
              ),
            ],
          ),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'tab-close',
              tabindex: -1,
              // The pointer-user duplicate of the tab's Delete action; hidden
              // from the accessibility tree because a tablist may own only
              // tabs (axe `aria-required-children`).
              'aria-hidden': 'true',
              onClick: (event: MouseEvent): void => {
                event.stopPropagation()
                props.onClose(props.path)
              },
              onMouseover: closeOver,
              onMouseout: closeOut,
              onFocusin: closeFocusIn,
              onFocusout: closeFocusOut,
              class: cm.cn(
                cm.textMuted,
                cm.textSize('xs'),
                cm.cursorPointer,
                cm.touchTargetCompact,
              ),
              /* mol-bespoke-button: icon-only ✕ tab close, hover-revealed, 16px
                 square so the mark sits dead-centre in a 32px tab. Its hit floor is
                 the ClassMap's 36px (min-width/height beat the 16px width/height
                 below) — it used to be a bespoke 32px. */
              style: {
                // Square button (equal width/height) with the glyph centered on both
                // axes — no asymmetric padding, so the ✕ sits dead-center in the tab.
                // On touch-first devices neither hover nor the focus reveal
                // applies, so the close is also always visible, dimmed.
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '16px',
                height: '16px',
                border: 'none',
                padding: 0,
                background:
                  isCloseHovered.value || isCloseFocused.value
                    ? 'rgba(128,128,128,0.25)'
                    : 'transparent',
                color:
                  isCloseHovered.value || isCloseFocused.value
                    ? 'var(--color-foreground, #e0e0e0)'
                    : undefined,
                lineHeight: 1,
                borderRadius: '3px',
                marginLeft: '4px',
                marginRight: props.isCoarse ? '-8px' : '-4px',
                opacity: isHovered.value || closeRevealed.value ? 1 : props.isCoarse ? 0.6 : 0,
                transition: 'opacity 100ms, background 80ms, color 80ms',
              },
              'aria-label': t(
                'ide.tabs.close',
                { fileName },
                { defaultValue: 'Close {{fileName}}' },
              ),
            },
            [
              // SVG X (not a text ✕ glyph, whose font metrics never center cleanly) so the
              // mark sits dead-center in the square button — matches the tip/skill dismiss X.
              h(
                'svg',
                {
                  width: '10',
                  height: '10',
                  viewBox: '0 0 16 16',
                  fill: 'none',
                  'aria-hidden': 'true',
                },
                [
                  h('path', {
                    d: 'M3 3l10 10M13 3L3 13',
                    stroke: 'currentColor',
                    'stroke-width': '1.6',
                    'stroke-linecap': 'round',
                  }),
                ],
              ),
            ],
          ),
        ],
      )
    }
  },
})

/**
 * Horizontally scrollable tab bar for open editor files.
 */
export const TabBar = defineComponent({
  name: 'TabBar',
  inheritAttrs: false,
  props: {
    /** The open editor tabs. */
    tabs: { type: Array as PropType<TabBarProps['tabs']>, required: true },
    /** The active file's path, or null when no file is open. */
    activeFile: { type: [String, null] as PropType<string | null>, required: true },
    /** Selects a tab. */
    onSelect: { type: Function as PropType<TabBarProps['onSelect']>, required: true },
    /** Closes a tab. */
    onClose: { type: Function as PropType<TabBarProps['onClose']>, required: true },
    /** Double-clicks a tab (pinning a preview). */
    onDoubleClick: {
      type: Function as PropType<TabBarProps['onDoubleClick']>,
      required: false,
      default: undefined,
    },
    /** Maps file path to git status for coloring tab filenames. */
    fileStatuses: {
      type: Object as PropType<Record<string, string>>,
      required: false,
      default: undefined,
    },
    /** Extra classes for the bar. */
    className: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const mode = useThemeMode()
    const isLight = computed(() => mode.value === 'light')
    const isCoarse = useCoarsePointer()
    const scrollRef = ref<HTMLDivElement | null>(null)

    // Scroll the active tab into view whenever it changes
    watchPostEffect(() => {
      const el = scrollRef.value
      const activeFile = props.activeFile
      if (!el || !activeFile) return
      const tab = el.querySelector('[aria-selected="true"]') as HTMLElement | null
      tab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
    })

    return (): VNodeChild => {
      const coarse = isCoarse.value
      const light = isLight.value
      // Fresh per render: React re-renders every tab whenever the bar renders
      // (none of it is memoized), and the tab's translate call is part of that
      // observable behavior. Vue skips a child whose props are shallow-equal,
      // so the color tables — stable values, fresh identity — are what carries
      // the bar's re-render down to each tab.
      const statusColors = light ? { ...LIGHT_STATUS_COLORS } : { ...DARK_STATUS_COLORS }
      const diagnosticColors = light ? { ...LIGHT_DIAGNOSTIC } : { ...DARK_DIAGNOSTIC }

      if (props.tabs.length === 0) return null

      return h(
        'div',
        { class: cm.cn(cm.shrink0, cm.surfaceSecondary, cm.borderB, props.className) },
        [
          h(
            'div',
            {
              ref: scrollRef,
              class: cm.flex({ direction: 'row', align: 'center' }),
              style: {
                overflowX: 'auto',
                scrollbarWidth: 'none',
                height: coarse ? '40px' : '32px',
                // Momentum scrolling on legacy iOS; keep a horizontal fling on the tab
                // strip from turning into browser back/forward navigation.
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
              },
              role: 'tablist',
            },
            props.tabs.map((tab) =>
              h(TabItem, {
                key: tab.path,
                path: tab.path,
                isDirty: tab.isDirty,
                isActive: tab.path === props.activeFile,
                isPreview: tab.isPreview,
                isDiff: tab.isDiff,
                gitStatus: props.fileStatuses?.[tab.path],
                // Diff tabs show historical content — error/warning coloring from the
                // live file's diagnostics would misread as "the diff has errors".
                diagnostics: tab.isDiff ? undefined : tab.diagnostics,
                onSelect: props.onSelect,
                onClose: props.onClose,
                onDoubleClick: props.onDoubleClick,
                statusColors,
                diagnosticColors,
                isCoarse: coarse,
              }),
            ),
          ),
        ],
      )
    }
  },
})
