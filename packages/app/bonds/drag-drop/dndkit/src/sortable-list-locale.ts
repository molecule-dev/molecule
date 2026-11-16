/**
 * The translated text a sortable list's rows carry, kept in the current locale.
 *
 * dnd-kit's accessibility plugin writes the instructions text once, when the
 * first row registers, and gives every row the English role description
 * `draggable`. {@link SortableListLocale} gives each row the translated role
 * description instead, and rewrites both when the locale changes.
 *
 * @module
 */

import type { PluginOptions } from '@dnd-kit/abstract'
import { Plugin } from '@dnd-kit/abstract'
import type { DragDropManager } from '@dnd-kit/dom'

import { onLocaleChange, t } from '@molecule/app-i18n'

/**
 * The instructions a screen reader reads for a row, in the current locale.
 *
 * @returns The translated instructions.
 */
export function sortableListInstructions(): string {
  return t('dragDrop.sortable.instructions', undefined, {
    defaultValue:
      'To pick up an item, press Space or Enter. While dragging, use the arrow keys to move it. Press Space or Enter again to drop it in its new position, or Escape to cancel.',
  })
}

/**
 * The role description a screen reader announces for a row (its
 * `aria-roledescription`), in the current locale.
 *
 * @returns The translated role description.
 */
export function sortableItemRoleDescription(): string {
  return t('dragDrop.sortable.roleDescription', undefined, { defaultValue: 'sortable' })
}

/** Options of {@link SortableListLocale}. */
export interface SortableListLocaleOptions extends PluginOptions {
  /** The id of the element that holds the list's instructions. */
  descriptionId: string
}

/**
 * A dnd-kit plugin that sets each row's `aria-roledescription` to
 * {@link sortableItemRoleDescription} and, on every locale change, rewrites it
 * and the instructions element named by `descriptionId`.
 */
export class SortableListLocale extends Plugin<DragDropManager, SortableListLocaleOptions> {
  private readonly stopListening: () => void
  private readonly observer: MutationObserver

  /**
   * Creates the plugin for one list's manager.
   *
   * @param manager - The list's drag-and-drop manager.
   * @param options - The id of the list's instructions element.
   */
  constructor(manager: DragDropManager, options?: SortableListLocaleOptions) {
    super(manager, options)
    const set = (element: Element, roleDescription = sortableItemRoleDescription()): void => {
      if (element.getAttribute('aria-roledescription') !== roleDescription)
        element.setAttribute('aria-roledescription', roleDescription)
    }
    // dnd-kit's accessibility plugin writes `draggable` in a later frame, in an order relative to this
    // plugin that varies; the observer puts the translation back after any such write.
    this.observer = new MutationObserver((records) => {
      for (const record of records) if (record.target instanceof Element) set(record.target)
    })
    const label = (): void => {
      const roleDescription = sortableItemRoleDescription()
      for (const draggable of this.manager.registry.draggables.value) {
        const activator = draggable.handle ?? draggable.element
        if (!activator) continue
        set(activator, roleDescription)
        this.observer.observe(activator, {
          attributes: true,
          attributeFilter: ['aria-roledescription'],
        })
      }
    }
    // `label` reads the rows reactively, so this runs again whenever a row registers or gets a handle.
    this.registerEffect(label)
    this.stopListening = onLocaleChange(() => {
      const description = options ? document.getElementById(options.descriptionId) : null
      if (description) description.textContent = sortableListInstructions()
      label()
    })
  }

  /** Stops following the locale and the rows, and removes the plugin's effect. */
  override destroy(): void {
    this.stopListening()
    this.observer.disconnect()
    super.destroy()
  }
}
