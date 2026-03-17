/**
 * Horizontal scrollable editor tab bar.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { TabBarProps } from '../types.js'

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
 * @param root0 - Component props.
 * @param root0.name - The filename to resolve an icon for.
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
// Tab — individual tab with hover-gated close button
// ---------------------------------------------------------------------------

interface TabItemProps {
  path: string
  isDirty?: boolean
  isActive: boolean
  isPreview?: boolean
  gitStatus?: string
  diagnostics?: { errors: number; warnings: number }
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onDoubleClick?: (path: string) => void
  statusColors: Record<string, string>
  diagnosticColors: Record<string, string>
}

/**
 * Individual tab item with hover-gated close button and status coloring.
 * @param root0 - Component props.
 * @param root0.path - The file path this tab represents.
 * @param root0.isDirty - Whether the file has unsaved changes.
 * @param root0.isActive - Whether this tab is the currently active one.
 * @param root0.isPreview - Whether this tab is a preview (italic) tab.
 * @param root0.gitStatus - The git status string for color coding.
 * @param root0.diagnostics - Error and warning counts for the file.
 * @param root0.onSelect - Callback when the tab is clicked.
 * @param root0.onClose - Callback when the close button is clicked.
 * @param root0.onDoubleClick - Callback when the tab is double-clicked (pin).
 * @param root0.statusColors - Map of git status names to colors.
 * @param root0.diagnosticColors - Map of diagnostic severity to colors.
 * @returns The rendered tab item element.
 */
function TabItem({
  path,
  isDirty,
  isActive,
  isPreview,
  gitStatus,
  diagnostics,
  onSelect,
  onClose,
  onDoubleClick,
  statusColors,
  diagnosticColors,
}: TabItemProps): JSX.Element {
  const cm = getClassMap()
  const [isHovered, setIsHovered] = useState(false)
  const fileName = path.split('/').pop() || path
  const fileColor = resolveFileColor(statusColors, diagnosticColors, diagnostics, gitStatus)

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      onClick={() => onSelect(path)}
      onDoubleClick={() => onDoubleClick?.(path)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(path)
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ userSelect: 'none', height: '32px' }}
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
      <FileTypeIcon name={fileName} />
      <span style={{ fontStyle: isPreview ? 'italic' : undefined, color: fileColor, textDecoration: gitStatus === 'deleted' ? 'line-through' : undefined }}>
        {fileName}
        {isDirty && <span className={cm.textWarning}> {'\u2022'}</span>}
      </span>
      <button
        type="button"
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
        className={cm.cn(cm.textMuted, cm.textSize('xs'), cm.cursorPointer)}
        style={{
          border: 'none',
          background: 'transparent',
          padding: '1px 3px',
          lineHeight: 1,
          borderRadius: '3px',
          marginLeft: '4px',
          marginRight: '-4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 100ms, background 80ms, color 80ms',
        }}
        aria-label={t('ide.tabs.close', { fileName })}
      >
        {'\u2715'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

/**
 * Horizontally scrollable tab bar for open editor files.
 * @param root0 - The component props.
 * @param root0.tabs - The list of open file tabs.
 * @param root0.activeFile - The path of the currently active file.
 * @param root0.onSelect - Callback invoked when a tab is clicked.
 * @param root0.onClose - Callback invoked when a tab's close button is clicked.
 * @param root0.onDoubleClick - Callback invoked when a tab is double-clicked (pin).
 * @param root0.fileStatuses - Git status map keyed by file path.
 * @param root0.className - Optional CSS class name for the tab bar.
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
        style={{ overflowX: 'auto', scrollbarWidth: 'none', height: '32px' }}
        role="tablist"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.path}
            path={tab.path}
            isDirty={tab.isDirty}
            isActive={tab.path === activeFile}
            isPreview={tab.isPreview}
            gitStatus={fileStatuses?.[tab.path]}
            diagnostics={tab.diagnostics}
            onSelect={onSelect}
            onClose={onClose}
            onDoubleClick={onDoubleClick}
            statusColors={statusColors}
            diagnosticColors={diagnosticColors}
          />
        ))}
      </div>
    </div>
  )
}

TabBar.displayName = 'TabBar'
