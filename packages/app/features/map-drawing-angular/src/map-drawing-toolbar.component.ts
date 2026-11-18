/**
 * MapDrawingToolbar component (React parity).
 *
 * Angular counterpart of `@molecule/app-map-drawing-react`'s `MapDrawingToolbar`
 * — one button per drawing tool plus the select, cancel-draft and delete
 * actions. Same props (React names), same ClassMap classes, same DOM.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ActiveTool, DrawingTool } from './types.js'

/**
 * Toolbar with one button per drawing tool plus `select` and `delete`.
 *
 * The host IS React's root `<div role="toolbar">` (`div[mol-map-drawing-toolbar]`).
 */
@Component({
  selector: 'div[mol-map-drawing-toolbar]',
  standalone: true,
  inputs: [
    'tools',
    'activeTool',
    'onActiveToolChange',
    'onDeleteSelected',
    'hasSelection',
    'hasDraft',
    'onCancelDraft',
  ],
  host: {
    role: 'toolbar',
    '[attr.aria-label]': 'toolbarLabel()',
    'data-mol-id': 'map-drawing-toolbar',
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (tool of tools ?? []; track tool) {<button type="button" [attr.aria-pressed]="activeTool === tool ? 'true' : 'false'" [attr.data-mol-id]="'map-drawing-tool-' + tool" [attr.data-active]="activeTool === tool ? 'true' : 'false'" (click)="selectTool(tool)" [class]="buttonClasses()">{{ toolLabel(tool) }}</button>}<button type="button" [attr.aria-pressed]="activeTool === 'select' ? 'true' : 'false'" data-mol-id="map-drawing-tool-select" [attr.data-active]="activeTool === 'select' ? 'true' : 'false'" (click)="selectMode()" [class]="buttonClasses()">{{ selectLabel() }}</button><button type="button" data-mol-id="map-drawing-tool-cancel-draft" [disabled]="!hasDraft" [attr.aria-disabled]="hasDraft ? 'false' : 'true'" (click)="cancelClick($event)" [class]="buttonClasses()">{{ cancelLabel() }}</button><button type="button" data-mol-id="map-drawing-tool-delete" [disabled]="!hasSelection" [attr.aria-disabled]="hasSelection ? 'false' : 'true'" (click)="deleteClick($event)" [class]="buttonClasses()">{{ deleteLabel() }}</button>`,
})
export class MapDrawingToolbar {
  /** Drawing tools to expose (in declaration order). */
  tools?: DrawingTool[]
  /** Currently active tool. */
  activeTool?: ActiveTool
  /** Called when the user clicks a tool button. */
  onActiveToolChange?: (tool: ActiveTool) => void
  /** Called when the user clicks the delete-selected button. */
  onDeleteSelected?: (event?: Event) => void
  /** Whether anything is currently selected. */
  hasSelection?: boolean
  /** Whether a draft is in progress. */
  hasDraft?: boolean
  /** Called when the user clicks the cancel-draft button. */
  onCancelDraft?: (event?: Event) => void

  /** The i18n translator (re-read on every locale switch). */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The toolbar's class list (React's `cm.cn`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.cm().sp('p', 1))
  }

  /**
   * One button's class list (React's `cm.button`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(this.cm().button({ variant: 'ghost', size: 'sm' }))
  }

  /**
   * The translated toolbar label.
   * @returns The translated label.
   */
  toolbarLabel(): string {
    return this.i18n.t('mapDrawing.toolbar.aria', {}, { defaultValue: 'Map drawing tools' })
  }

  /**
   * The translated label of one drawing tool (a literal key per tool).
   * @param tool - The tool.
   * @returns The translated label.
   */
  toolLabel(tool: DrawingTool): string {
    switch (tool) {
      case 'polygon':
        return this.i18n.t('mapDrawing.tool.polygon', {}, { defaultValue: 'Polygon' })
      case 'circle':
        return this.i18n.t('mapDrawing.tool.circle', {}, { defaultValue: 'Circle' })
      case 'pin':
        return this.i18n.t('mapDrawing.tool.pin', {}, { defaultValue: 'Pin' })
      case 'line':
        return this.i18n.t('mapDrawing.tool.line', {}, { defaultValue: 'Line' })
    }
  }

  /**
   * The translated select label.
   * @returns The translated label.
   */
  selectLabel(): string {
    return this.i18n.t('mapDrawing.tool.select', {}, { defaultValue: 'Select' })
  }

  /**
   * The translated cancel-draft label.
   * @returns The translated label.
   */
  cancelLabel(): string {
    return this.i18n.t('mapDrawing.tool.cancelDraft', {}, { defaultValue: 'Cancel draft' })
  }

  /**
   * The translated delete label.
   * @returns The translated label.
   */
  deleteLabel(): string {
    return this.i18n.t('mapDrawing.tool.delete', {}, { defaultValue: 'Delete' })
  }

  /**
   * Report a tool click upward.
   * @param tool - The clicked tool.
   */
  selectTool(tool: ActiveTool): void {
    this.onActiveToolChange?.(tool)
  }

  /** Report a select-mode click upward. */
  selectMode(): void {
    this.onActiveToolChange?.('select')
  }

  /**
   * Report a cancel-draft click upward (React passes the click event through).
   * @param event - The click event.
   */
  cancelClick(event: Event): void {
    this.onCancelDraft?.(event)
  }

  /**
   * Report a delete click upward (React passes the click event through).
   * @param event - The click event.
   */
  deleteClick(event: Event): void {
    this.onDeleteSelected?.(event)
  }
}
