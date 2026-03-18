/**
 * Context menu for the file explorer — shown on right-click.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { FileNode } from '../types.js'

/** Action identifiers for context menu items. */
export type ContextMenuAction =
  | 'open'
  | 'newFile'
  | 'newFolder'
  | 'rename'
  | 'delete'
  | 'copyPath'
  | 'copyRelativePath'
  | 'collapseAll'

interface ContextMenuProps {
  /** Screen coordinates where the menu should appear. */
  position: { x: number; y: number }
  /** The file/directory node that was right-clicked, or null for background. */
  node: FileNode | null
  /** Called when the user selects a menu action. */
  onAction: (action: ContextMenuAction) => void
  /** Called when the menu should close (Escape, outside click, after action). */
  onClose: () => void
}

interface MenuItem {
  action: ContextMenuAction
  label: string
  shortcut?: string
  separator?: boolean
}

/**
 * Build the list of menu items based on context (file, directory, or background).
 * @param node - The right-clicked node, or null for background.
 * @returns Array of menu items with optional separators.
 */
function getMenuItems(node: FileNode | null): MenuItem[] {
  if (!node) {
    // Background (empty area)
    return [
      {
        action: 'newFile',
        label: t('ide.contextMenu.newFile', undefined, { defaultValue: 'New File...' }),
      },
      {
        action: 'newFolder',
        label: t('ide.contextMenu.newFolder', undefined, { defaultValue: 'New Folder...' }),
      },
      {
        action: 'collapseAll',
        label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
        separator: true,
      },
    ]
  }

  if (node.type === 'directory') {
    return [
      {
        action: 'newFile',
        label: t('ide.contextMenu.newFile', undefined, { defaultValue: 'New File...' }),
      },
      {
        action: 'newFolder',
        label: t('ide.contextMenu.newFolder', undefined, { defaultValue: 'New Folder...' }),
      },
      {
        action: 'rename',
        label: t('ide.contextMenu.rename', undefined, { defaultValue: 'Rename' }),
        shortcut: 'F2',
        separator: true,
      },
      {
        action: 'delete',
        label: t('ide.contextMenu.delete', undefined, { defaultValue: 'Delete' }),
      },
      {
        action: 'copyPath',
        label: t('ide.contextMenu.copyPath', undefined, { defaultValue: 'Copy Path' }),
        separator: true,
      },
      {
        action: 'copyRelativePath',
        label: t('ide.contextMenu.copyRelativePath', undefined, {
          defaultValue: 'Copy Relative Path',
        }),
      },
    ]
  }

  // File
  return [
    { action: 'open', label: t('ide.contextMenu.open', undefined, { defaultValue: 'Open' }) },
    {
      action: 'rename',
      label: t('ide.contextMenu.rename', undefined, { defaultValue: 'Rename' }),
      shortcut: 'F2',
      separator: true,
    },
    { action: 'delete', label: t('ide.contextMenu.delete', undefined, { defaultValue: 'Delete' }) },
    {
      action: 'copyPath',
      label: t('ide.contextMenu.copyPath', undefined, { defaultValue: 'Copy Path' }),
      separator: true,
    },
    {
      action: 'copyRelativePath',
      label: t('ide.contextMenu.copyRelativePath', undefined, {
        defaultValue: 'Copy Relative Path',
      }),
    },
  ]
}

/**
 * Portal-rendered context menu for the file explorer.
 * @param root0 - Component props.
 * @param root0.position - Screen coordinates for the menu.
 * @param root0.node - The right-clicked file node or null for background.
 * @param root0.onAction - Callback when a menu item is selected.
 * @param root0.onClose - Callback to dismiss the menu.
 * @returns The rendered context menu portal.
 */
export function FileExplorerContextMenu({
  position,
  node,
  onAction,
  onClose,
}: ContextMenuProps): JSX.Element {
  const cm = getClassMap()
  const menuRef = useRef<HTMLDivElement>(null)

  // Clamp position to viewport on mount
  const clampedPos = useRef(position)
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let { x, y } = position
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4
    if (x < 0) x = 4
    if (y < 0) y = 4
    clampedPos.current = { x, y }
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }, [position])

  // Close on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [onClose])

  const handleClick = useCallback(
    (action: ContextMenuAction) => {
      onAction(action)
      onClose()
    },
    [onAction, onClose],
  )

  const items = getMenuItems(node)

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      className={cm.dropdownContent}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        minWidth: '160px',
      }}
    >
      {items.map((item, i) => (
        <div key={item.action}>
          {item.separator && i > 0 && <div className={cm.dropdownSeparator} role="separator" />}
          <div
            role="menuitem"
            tabIndex={0}
            className={cm.dropdownItem}
            onClick={() => handleClick(item.action)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(item.action)
              }
            }}
          >
            <span className={cm.dropdownItemLabel}>{item.label}</span>
            {item.shortcut && <span className={cm.dropdownItemShortcut}>{item.shortcut}</span>}
          </div>
        </div>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}

FileExplorerContextMenu.displayName = 'FileExplorerContextMenu'
