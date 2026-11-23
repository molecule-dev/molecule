/**
 * Context menu for the file explorer — shown on right-click.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `FileExplorerContextMenu`
 * (see that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same callbacks. The host element IS React's
 * root `div` (an attribute selector, `role="menu"` through a host binding), so
 * the menu's own classes and inline style sit on it; React portals the menu
 * into `document.body`, so the constructor moves the host there and Angular's
 * own removal still finds it (`removeChild` removes from wherever the node
 * lives). The position clamps into the viewport on every change-detection pass,
 * measured from the host's own box — the same clamp React's mount/position
 * effect applies to the style; `Escape` (a document listener in the capture
 * phase, which stops the key from reaching the rows) and a pointer press
 * outside close it; a row acts on click and on `Enter`/`Space` alone. The
 * component is a part (React renders it inside `FileExplorer` without
 * exporting it), so it lives in `src/parts/` and is exported under the React
 * name.
 *
 * Derived values are methods the template reads, so each change-detection pass
 * renders the current state the way React's render does. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are layout the ClassMap
 * can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, DestroyRef, ElementRef, inject } from '@angular/core'

import { placeElement, useTranslation } from '@molecule/app-angular'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

/** Action identifiers for context menu items. */
export type ContextMenuAction =
  | 'open'
  | 'newFile'
  | 'newFolder'
  | 'rename'
  | 'delete'
  | 'deleteMultiple'
  | 'copyPath'
  | 'copyPaths'
  | 'copyRelativePath'
  | 'copyRelativePaths'
  | 'cut'
  | 'paste'
  | 'collapseAll'

/** Actions that WRITE the tree — omitted entirely in read-only mode. */
const MUTATING_ACTIONS: ReadonlySet<ContextMenuAction> = new Set([
  'newFile',
  'newFolder',
  'rename',
  'delete',
  'deleteMultiple',
  'cut',
  'paste',
])

/** One row of the menu. */
interface MenuItem {
  action: ContextMenuAction
  label: string
  shortcut?: string
  separator?: boolean
}

/**
 * Build the list of menu items based on context (file, directory, or background).
 * @param t - The translation function from `useTranslation()`.
 * @param node - The right-clicked node, or null for background.
 * @param selectedCount - Number of selected items (> 1 triggers multi-select menu).
 * @param canPaste - Whether paste is available.
 * @param readOnly - Read-only mode: mutating actions are omitted.
 * @returns Array of menu items with optional separators.
 */
function getMenuItems(
  t: ReturnType<typeof useTranslation>['t'],
  node: FileNode | null,
  selectedCount: number,
  canPaste: boolean,
  readOnly?: boolean,
): MenuItem[] {
  const filterReadOnly = (items: MenuItem[]): MenuItem[] =>
    readOnly ? items.filter((i) => !MUTATING_ACTIONS.has(i.action)) : items
  if (!node) {
    // Background (empty area)
    const items: MenuItem[] = [
      {
        action: 'newFile',
        label: t('ide.contextMenu.newFile', undefined, { defaultValue: 'New File...' }),
      },
      {
        action: 'newFolder',
        label: t('ide.contextMenu.newFolder', undefined, { defaultValue: 'New Folder...' }),
      },
    ]
    if (canPaste) {
      items.push({
        action: 'paste',
        label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
        shortcut: '⌘V',
        separator: true,
      })
    }
    items.push({
      action: 'collapseAll',
      label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
      separator: !canPaste,
    })
    return filterReadOnly(items)
  }

  // Multi-select menu (2+ items selected)
  if (selectedCount > 1) {
    const items: MenuItem[] = [
      {
        action: 'deleteMultiple',
        label: t(
          'ide.contextMenu.deleteCount',
          { count: selectedCount },
          { defaultValue: 'Delete {{count}} Items' },
        ),
        shortcut: '⌫',
      },
      {
        action: 'cut',
        label: t('ide.contextMenu.cut', undefined, { defaultValue: 'Cut' }),
        shortcut: '⌘X',
        separator: true,
      },
      {
        action: 'copyPaths',
        label: t('ide.contextMenu.copyPaths', undefined, { defaultValue: 'Copy Paths' }),
        separator: true,
      },
      {
        action: 'copyRelativePaths',
        label: t('ide.contextMenu.copyRelativePaths', undefined, {
          defaultValue: 'Copy Relative Paths',
        }),
      },
    ]
    if (canPaste) {
      items.push({
        action: 'paste',
        label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
        shortcut: '⌘V',
        separator: true,
      })
    }
    items.push({
      action: 'collapseAll',
      label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
      separator: true,
    })
    return filterReadOnly(items)
  }

  // Single-item menus
  if (node.type === 'directory') {
    const items: MenuItem[] = [
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
        action: 'cut',
        label: t('ide.contextMenu.cut', undefined, { defaultValue: 'Cut' }),
        shortcut: '⌘X',
      },
    ]
    if (canPaste) {
      items.push({
        action: 'paste',
        label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
        shortcut: '⌘V',
      })
    }
    items.push(
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
      {
        action: 'collapseAll',
        label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
        separator: true,
      },
    )
    return filterReadOnly(items)
  }

  // File
  const items: MenuItem[] = [
    { action: 'open', label: t('ide.contextMenu.open', undefined, { defaultValue: 'Open' }) },
    {
      action: 'rename',
      label: t('ide.contextMenu.rename', undefined, { defaultValue: 'Rename' }),
      shortcut: 'F2',
      separator: true,
    },
    { action: 'delete', label: t('ide.contextMenu.delete', undefined, { defaultValue: 'Delete' }) },
    {
      action: 'cut',
      label: t('ide.contextMenu.cut', undefined, { defaultValue: 'Cut' }),
      shortcut: '⌘X',
    },
  ]
  if (canPaste) {
    items.push({
      action: 'paste',
      label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
      shortcut: '⌘V',
    })
  }
  items.push(
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
  )
  return filterReadOnly(items)
}

/**
 * Portal-rendered context menu for the file explorer. React renders it under
 * the React name `FileExplorerContextMenu`.
 */
@Component({
  selector: 'div[mol-file-explorer-context-menu]',
  standalone: true,
  inputs: ['position', 'node', 'selectedCount', 'canPaste', 'onAction', 'onClose', 'readOnly'],
  host: {
    role: 'menu',
    '[class]': 'cm.dropdownContent',
    '[style.position]': '"fixed"',
    '[style.left]': 'px(leftValue())',
    '[style.top]': 'px(topValue())',
    '[style.z-index]': '"9999"',
    '[style.min-width]': '"160px"',
  },
  // prettier-ignore
  template: `@for (item of items(); track item.action) {<div>@if (item.separator && $index > 0) {<div role="separator" [class]="cm.dropdownSeparator"></div>}<div role="menuitem" tabindex="0" [attr.data-mol-id]="'file-context-' + item.action" [class]="cm.cn(cm.dropdownItem, cm.touchTargetCompact)" (click)="fire(item.action)" (keydown)="onItemKeydown($event, item.action)"><span [class]="cm.dropdownItemLabel">{{ item.label }}</span>@if (item.shortcut) {<span [class]="cm.dropdownItemShortcut">{{ item.shortcut }}</span>}</div></div>}`,
})
export class FileExplorerContextMenu {
  /** Screen coordinates where the menu should appear. */
  position: { x: number; y: number } = { x: 0, y: 0 }

  /** The file/directory node that was right-clicked, or null for background. */
  node: FileNode | null = null

  /** Number of items in the current multi-selection (0 or 1 = single mode). */
  selectedCount = 0

  /** Whether paste is available (clipboard has cut items). */
  canPaste = false

  /** Called when the user selects a menu action. */
  onAction?: (action: ContextMenuAction) => void

  /** Called when the menu should close (Escape, outside click, after action). */
  onClose?: () => void

  /** Read-only mode: every mutating entry is omitted. */
  readOnly?: boolean

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the row labels. */
  protected readonly t = this.i18n.t

  /** The menu's host element (React's portalled menu root). */
  private readonly hostEl: HTMLElement = inject(ElementRef).nativeElement

  constructor() {
    // React portals the menu into `document.body`; move the host there the way
    // the portal does — appended last, so it lands where React's menu lands.
    // Angular's own node removal removes from wherever the node lives.
    placeElement(this.hostEl, document.body)

    // Close on Escape (the capture-phase listener stops the key from reaching
    // anything else) or outside click, and remove both with the component.
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.onClose?.()
      }
    }
    const onPointerDown = (e: PointerEvent): void => {
      if (!this.hostEl.contains(e.target as Node)) {
        this.onClose?.()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown)
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown)
    })
  }

  /**
   * The rows of the menu for the current node, selection, clipboard and
   * read-only state (React builds them on every render; `t` reads the locale,
   * so a switch re-renders the rows).
   * @returns The rows with optional separators.
   */
  protected items(): MenuItem[] {
    return getMenuItems(this.t, this.node, this.selectedCount, this.canPaste, this.readOnly)
  }

  /**
   * The position clamped into the viewport against the menu's measured box —
   * React clamps the style from its mount/position effect; reading the clamp
   * per change-detection pass gives every pass (a locale switch included) the
   * clamped spot.
   * @returns The clamped x.
   */
  protected leftValue(): number {
    return this.clampIntoViewport().x
  }

  /**
   * The position clamped into the viewport against the menu's measured box.
   * @returns The clamped y.
   */
  protected topValue(): number {
    return this.clampIntoViewport().y
  }

  /**
   * Appends the `px` unit the DOM needs (React adds it for a number style).
   * @param value - A pixel count.
   * @returns The CSS length.
   */
  protected px(value: number): string {
    return `${value}px`
  }

  /**
   * The position clamped into the viewport: a box that would render past the
   * right or bottom edge is pulled back inside it (4px of air), a negative
   * coordinate to 4px.
   * @returns The clamped position.
   */
  private clampIntoViewport(): { x: number; y: number } {
    const rect = this.hostEl.getBoundingClientRect()
    let { x, y } = this.position
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4
    if (x < 0) x = 4
    if (y < 0) y = 4
    return { x, y }
  }

  /**
   * Acts on a row: fire the action, then close — React's `handleClick`.
   * @param action - The row's action.
   */
  protected fire(action: ContextMenuAction): void {
    const onAction = this.onAction
    if (onAction) onAction(action)
    const onClose = this.onClose
    if (onClose) onClose()
  }

  /**
   * Acts on a key press the way React's row handler does: `Enter` and `Space`
   * act (with the default prevented), every other key does nothing.
   *
   * @param event - The key press.
   * @param action - The row's action.
   */
  protected onItemKeydown(event: KeyboardEvent, action: ContextMenuAction): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.fire(action)
    }
  }
}
