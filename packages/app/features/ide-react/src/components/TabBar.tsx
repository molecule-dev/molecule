/**
 * Horizontal scrollable editor tab bar.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { TabBarProps } from '@molecule/app-ide-panel-logic'
import { useThemeMode, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'

// ---------------------------------------------------------------------------
// Status colors — dark/light variants for readability
// ---------------------------------------------------------------------------

const DARK_STATUS_COLORS: Record<string, string> = {
  modified: '#e2c08d',
  added: '#73c991',
  untracked: '#73c991',
  deleted: '#c74e39',
}

const LIGHT_STATUS_COLORS: Record<string, string> = {
  modified: '#8a6010',
  added: '#1a7030',
  untracked: '#1a7030',
  deleted: '#a03020',
}

const DARK_DIAGNOSTIC: Record<string, string> = {
  error: '#f14c4c',
  deleted: '#c74e39',
  warning: '#cca700',
}

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

// ---------------------------------------------------------------------------
// FileTypeIcon — mirrors the one in FileExplorer
// ---------------------------------------------------------------------------

/**
 * File type icon resolved from material-file-icons.
 * @param props - Component props (see {@link TabItemProps}).
 * @returns The rendered file type icon element.
 */
function FileTypeIcon({ name }: { name: string }): JSX.Element {
  const { svg } = getIcon(name)
  return (
    <span
      style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ---------------------------------------------------------------------------
// Tab — individual tab with hover- or focus-revealed close button
// ---------------------------------------------------------------------------

/** Props for a single editor tab. */
export interface TabItemProps {
  path: string
  isDirty?: boolean
  isActive: boolean
  isPreview?: boolean
  isDiff?: boolean
  gitStatus?: string
  diagnostics?: { errors: number; warnings: number }
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onDoubleClick?: (path: string) => void
  statusColors: Record<string, string>
  diagnosticColors: Record<string, string>
  /** Touch-first device — taller tab (40px) + larger, always-visible close target. */
  isCoarse: boolean
}

/**
 * Individual tab item with hover- or focus-revealed close button and status
 * coloring. The close control shows while the pointer is over the tab OR
 * focus is anywhere inside it — a keyboard user who tabs to the tab (or on to
 * the close control) sees the control they can act on, which a mouse-only
 * reveal violates (WCAG 2.4.7 Focus Visible). The close control's tint lights
 * on its own hover OR focus for the same reason.
 *
 * The wrapper is `role="presentation"` and owns the mouse behaviour (select,
 * double-click, hover reveal) plus the tab's geometry; the `role="tab"` inside
 * it carries the ARIA state and the keyboard path. A `tab`'s children are
 * presentational, so the close control is its SIBLING, not a child — otherwise
 * assistive technology drops the close button from the accessibility tree
 * (axe `nested-interactive`).
 *
 * ARIA cannot expose a close control next to a `tab` either: the presentation
 * wrapper is transparent in the accessibility tree, which makes any control
 * inside it an owned child of the `tablist`, and a `tablist` may own only
 * `tab`s (axe `aria-required-children`). The close action therefore lives on
 * the tab itself — Delete closes the focused tab, announced through
 * `aria-keyshortcuts="Delete"` — and the ✕ is the pointer-user affordance for
 * that same action, so it is `aria-hidden` (a hidden duplicate; the tab's
 * Delete key is the keyboard path). It stays clickable and out of the tab
 * order (`tabIndex={-1}`), so a tab never contains a second focus stop.
 * @param props - Component props (see {@link TabItemProps}).
 * @returns The rendered tab item element.
 */
function TabItem({
  path,
  isDirty,
  isActive,
  isPreview,
  isDiff,
  gitStatus,
  diagnostics,
  onSelect,
  onClose,
  onDoubleClick,
  statusColors,
  diagnosticColors,
  isCoarse,
}: TabItemProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  // The close control stays revealed while focus is anywhere inside the tab.
  // React's synthetic onFocus/onBlur bubble, so a focus moving between the tab
  // and its close control is one focused region, not a leave.
  const [closeRevealed, setCloseRevealed] = useState(false)
  const fileName = path.split('/').pop() || path
  const fileColor = resolveFileColor(statusColors, diagnosticColors, diagnostics, gitStatus)

  // For diff tabs, suppress the single-click during a double-click so that
  // setActiveTab (which destroys the diff) doesn't fire before onDoubleClick.
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleClick = isDiff
    ? () => {
        // Delay single-click; cancel if double-click fires first
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null
          onSelect(path)
        }, 250)
      }
    : () => onSelect(path)
  const handleDoubleClick = isDiff
    ? () => {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current)
          clickTimerRef.current = null
        }
        onDoubleClick?.(path)
      }
    : () => onDoubleClick?.(path)

  return (
    <div
      role="presentation"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setCloseRevealed(true)}
      onBlur={(e) => {
        // A focus moving INSIDE the tab (tab ⇄ close control) is not a leave.
        const next = e.relatedTarget
        if (!(next instanceof Node && e.currentTarget.contains(next))) setCloseRevealed(false)
      }}
      // 40px tall on touch-first devices — the WCAG-acceptable floor for a dense
      // toolbar row; 32px compact height on pointer devices (unchanged).
      style={{ userSelect: 'none', height: isCoarse ? '40px' : '32px' }}
      className={cm.cn(
        cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.textSize('sm'),
        cm.shrink0,
        cm.cursorPointer,
        cm.borderR,
        isActive && cm.surface,
        isActive && cm.borderBPrimary,
      )}
    >
      <div
        role="tab"
        title={path}
        tabIndex={0}
        aria-selected={isActive}
        // The close action's keyboard path; announced so it is discoverable.
        aria-keyshortcuts="Delete"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(path)
          // The close control is a sibling, so Delete on the tab is the
          // keyboard path to closing it (the button is out of the tab order).
          else if (e.key === 'Delete') onClose(path)
        }}
        className={cm.cn(cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))}
      >
        <FileTypeIcon name={fileName} />
        <span
          style={{
            fontStyle: isPreview ? 'italic' : undefined,
            color: fileColor,
            textDecoration: gitStatus === 'deleted' ? 'line-through' : undefined,
          }}
        >
          {fileName}
          {isDirty && <span className={cm.textWarning}> {'\u2022'}</span>}
        </span>
      </div>
      <button
        type="button"
        data-mol-id="tab-close"
        tabIndex={-1}
        // The pointer-user duplicate of the tab's Delete action; hidden from
        // the accessibility tree because a tablist may own only `tab`s, and
        // the tab itself carries the (announced) keyboard path.
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation()
          onClose(path)
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(128,128,128,0.25)'
          e.currentTarget.style.color = 'var(--color-foreground, #e0e0e0)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = ''
        }}
        onFocus={(e) => {
          e.currentTarget.style.background = 'rgba(128,128,128,0.25)'
          e.currentTarget.style.color = 'var(--color-foreground, #e0e0e0)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = ''
        }}
        className={cm.cn(cm.textMuted, cm.textSize('xs'), cm.cursorPointer, cm.touchTargetCompact)}
        /* mol-bespoke-button: icon-only ✕ tab close, hover/focus-revealed, 16px
           square so the mark sits dead-centre in a 32px tab. Its hit floor is
           the ClassMap's 36px (min-width/height beat the 16px width/height
           below) — it used to be a bespoke 32px. */
        style={{
          // Square button (equal width/height) with the glyph centered on both
          // axes — no asymmetric padding, so the ✕ sits dead-center in the tab.
          // On touch-first devices neither hover nor the focus reveal applies,
          // so the close is also always visible, dimmed.
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '16px',
          height: '16px',
          border: 'none',
          padding: 0,
          background: 'transparent',
          lineHeight: 1,
          borderRadius: '3px',
          marginLeft: '4px',
          marginRight: isCoarse ? '-8px' : '-4px',
          opacity: isHovered || closeRevealed ? 1 : isCoarse ? 0.6 : 0,
          transition: 'opacity 100ms, background 80ms, color 80ms',
        }}
        aria-label={t('ide.tabs.close', { fileName }, { defaultValue: 'Close {{fileName}}' })}
      >
        {/* SVG X (not a text \u2715 glyph, whose font metrics never center cleanly) so the
            mark sits dead-center in the square button \u2014 matches the tip/skill dismiss X. */}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

/**
 * Horizontally scrollable tab bar for open editor files.
 *
 * Every tab is a `role="presentation"` wrapper holding the `role="tab"` (its
 * ARIA state and keyboard path) beside the close control. A tab's children are
 * presentational, so the close button is its sibling, not a child
 * (`nested-interactive`); and a `tablist` may own only `tab`s, so the button
 * is the pointer-user duplicate of the tab's Delete action and is hidden from
 * the accessibility tree. Enter/Space selects the focused tab, Delete closes
 * it, and `aria-keyshortcuts` announces that.
 * @param props - Component props (see {@link TabBarProps} and {@link TabItemProps}).
 * @returns The rendered tab bar element, or null if no tabs are open.
 */
export function TabBar({
  tabs,
  activeFile,
  onSelect,
  onClose,
  onDoubleClick,
  fileStatuses,
  className,
}: TabBarProps): JSX.Element | null {
  const cm = getClassMap()
  const isLight = useThemeMode() === 'light'
  const isCoarse = useCoarsePointer()
  const statusColors = isLight ? LIGHT_STATUS_COLORS : DARK_STATUS_COLORS
  const diagnosticColors = isLight ? LIGHT_DIAGNOSTIC : DARK_DIAGNOSTIC
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll the active tab into view whenever it changes
  useEffect(() => {
    if (!scrollRef.current || !activeFile) return
    const el = scrollRef.current.querySelector('[aria-selected="true"]') as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [activeFile])

  if (tabs.length === 0) return null

  return (
    <div className={cm.cn(cm.shrink0, cm.surfaceSecondary, cm.borderB, className)}>
      <div
        ref={scrollRef}
        className={cm.flex({ direction: 'row', align: 'center' })}
        style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          height: isCoarse ? '40px' : '32px',
          // Momentum scrolling on legacy iOS; keep a horizontal fling on the tab
          // strip from turning into browser back/forward navigation.
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
        role="tablist"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.path}
            path={tab.path}
            isDirty={tab.isDirty}
            isActive={tab.path === activeFile}
            isPreview={tab.isPreview}
            isDiff={tab.isDiff}
            gitStatus={fileStatuses?.[tab.path]}
            // Diff tabs show historical content — error/warning coloring from the
            // live file's diagnostics would misread as "the diff has errors".
            diagnostics={tab.isDiff ? undefined : tab.diagnostics}
            onSelect={onSelect}
            onClose={onClose}
            onDoubleClick={onDoubleClick}
            statusColors={statusColors}
            diagnosticColors={diagnosticColors}
            isCoarse={isCoarse}
          />
        ))}
      </div>
    </div>
  )
}

TabBar.displayName = 'TabBar'
