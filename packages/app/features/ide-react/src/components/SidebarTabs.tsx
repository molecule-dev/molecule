/**
 * Sidebar tab switcher — toggles between file explorer and search panel.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { SidebarTabsProps } from '../types.js'
import { Icon } from './Icon.js'

/**
 * Sidebar tab strip with file explorer and search icons.
 *
 * @param props - Component props.
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
          <Icon
            name="folder"
            size={16}
            aria-hidden="true"
            style={{ opacity: activeTab === 'files' ? 1 : 0.6 }}
          />
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
          <Icon
            name="search"
            size={16}
            aria-hidden="true"
            style={{ opacity: activeTab === 'search' ? 1 : 0.6 }}
          />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
    </div>
  )
}

SidebarTabs.displayName = 'SidebarTabs'
