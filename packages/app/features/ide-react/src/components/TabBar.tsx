/**
 * Horizontal scrollable editor tab bar.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { TabBarProps } from '../types.js'

/**
 * Horizontally scrollable tab bar for open editor files.
 * @param root0 - The component props.
 * @param root0.tabs - The list of open file tabs.
 * @param root0.activeFile - The path of the currently active file.
 * @param root0.onSelect - Callback invoked when a tab is clicked.
 * @param root0.onClose - Callback invoked when a tab's close button is clicked.
 * @param root0.className - Optional CSS class name for the tab bar.
 * @returns The rendered tab bar element, or null if no tabs are open.
 */
export function TabBar({
  tabs,
  activeFile,
  onSelect,
  onClose,
  className,
}: TabBarProps): JSX.Element | null {
  const cm = getClassMap()

  if (tabs.length === 0) return null

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'row', align: 'center' }),
        cm.shrink0,
        cm.surfaceSecondary,
        cm.borderB,
        className,
      )}
      style={{ overflowX: 'auto' }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeFile
        const fileName = tab.path.split('/').pop() || tab.path

        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            className={cm.cn(
              cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.shrink0,
              cm.cursorPointer,
              cm.borderR,
              isActive && cm.surface,
              isActive && cm.borderBPrimary,
            )}
          >
            <span onClick={() => onSelect(tab.path)} style={{ cursor: 'pointer' }}>
              {fileName}
              {tab.isDirty && <span className={cm.textWarning}> {'\u2022'}</span>}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.path)
              }}
              className={cm.cn(cm.textMuted, cm.textSize('xs'), cm.cursorPointer)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0 2px',
                lineHeight: 1,
              }}
              aria-label={t('ide.tabs.close', { fileName })}
            >
              {'\u2715'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

TabBar.displayName = 'TabBar'
