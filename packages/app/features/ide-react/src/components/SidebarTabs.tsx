/**
 * Sidebar tab switcher — toggles between file explorer and search panel.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { SidebarTabsProps } from '../types.js'

/**
 * SVG icon for the file tree tab.
 * @param root0 - The component props.
 * @param root0.active - Whether this tab is currently active.
 * @returns The rendered SVG icon element.
 */
function FilesIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'currentColor' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.6 }}
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}

/**
 * SVG icon for the search tab (magnifying glass).
 * @param root0 - The component props.
 * @param root0.active - Whether this tab is currently active.
 * @returns The rendered SVG icon element.
 */
function SearchIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: active ? 1 : 0.6 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/**
 * Sidebar tab strip with file explorer and search icons.
 *
 * @param root0 - The component props.
 * @param root0.activeTab - The currently selected tab.
 * @param root0.onTabChange - Callback when tab is clicked.
 * @param root0.children - Content to render below the tab strip.
 * @param root0.className - Optional CSS class name.
 * @returns The sidebar tabs element.
 */
export function SidebarTabs({
  activeTab,
  onTabChange,
  children,
  className,
}: SidebarTabsProps): JSX.Element {
  const cm = getClassMap()

  return (
    <div
      className={cm.cn(cm.h('full'), cm.borderR, className)}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'row', align: 'center' }),
          cm.shrink0,
          cm.surfaceSecondary,
          cm.borderB,
        )}
      >
        <button
          type="button"
          onClick={() => onTabChange('files')}
          title={t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' })}
          aria-label={t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' })}
          style={{ userSelect: 'none', height: '32px', flex: 1, justifyContent: 'center' }}
          className={cm.cn(
            cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.textSize('sm'),
            cm.shrink0,
            cm.cursorPointer,
            cm.borderR,
            activeTab === 'files' && cm.surface,
            activeTab === 'files' && cm.borderBPrimary,
          )}
        >
          <FilesIcon active={activeTab === 'files'} />
        </button>
        <button
          type="button"
          onClick={() => onTabChange('search')}
          title={t('ide.sidebar.search', undefined, { defaultValue: 'Search' })}
          aria-label={t('ide.sidebar.search', undefined, { defaultValue: 'Search' })}
          style={{ userSelect: 'none', height: '32px', flex: 1, justifyContent: 'center' }}
          className={cm.cn(
            cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.textSize('sm'),
            cm.shrink0,
            cm.cursorPointer,
            activeTab === 'search' && cm.surface,
            activeTab === 'search' && cm.borderBPrimary,
          )}
        >
          <SearchIcon active={activeTab === 'search'} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
    </div>
  )
}

SidebarTabs.displayName = 'SidebarTabs'
