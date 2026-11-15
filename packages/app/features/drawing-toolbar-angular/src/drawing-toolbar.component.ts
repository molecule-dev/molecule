/**
 * DrawingToolbar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { DrawingTool } from './types.js'

/** The standard tool set React renders when the `tools` prop is omitted. */
const DEFAULT_TOOLS: DrawingTool[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'sticky', label: 'Sticky', icon: '🗒' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
]

/**
 * DrawingToolbar component.
 *
 * Whiteboard / canvas / annotation tool selector. The host IS the root
 * `<div>` (`div[mol-drawing-toolbar]`), matching React's root exactly. Each
 * tool renders as a `size="sm"` button — solid/primary while selected (with
 * `aria-pressed`), ghost otherwise — labelled `aria-label`/`title` from the
 * tool's label. The toolbar's own `aria-label` resolves through
 * `t('drawingToolbar.label')` with an English fallback. Angular's `@for`
 * tracks the tool's `id`, the way React keys its button list.
 *
 * `extras` is projected content (`[slot=extras]`) rendered after the tool
 * buttons — an input cannot carry a node. A tool's `icon` may be a plain
 * string or an `<ng-template>` ref.
 */
@Component({
  selector: 'div[mol-drawing-toolbar]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: ['tools', 'selectedId', 'onSelect', 'orientation', 'className'],
  host: {
    role: 'toolbar',
    '[class]': 'classes()',
    '[attr.aria-label]': 'label()',
  },
  template: `@for (tl of toolList(); track tl.id) {
      <button
        mol-button
        [variant]="tl.id === selectedId ? 'solid' : 'ghost'"
        [size]="'sm'"
        [attr.aria-pressed]="tl.id === selectedId"
        [attr.aria-label]="tl.label"
        [attr.title]="tl.label"
        (click)="select(tl)"
      >
        @if (isTemplate(tl.icon)) {
          <ng-container [ngTemplateOutlet]="tl.icon" />
        } @else if (tl.icon != null) {
          {{ tl.icon }}
        } @else {
          {{ firstChar(tl.label) }}
        }
      </button>
    }
    <ng-content select="[slot=extras]"></ng-content>`,
})
export class DrawingToolbar {
  /** Tools to render (the standard set until an input says otherwise). */
  tools?: DrawingTool[]
  /** Currently selected tool id. */
  selectedId?: string
  /** Called when the user picks a tool, with the tool's id. */
  onSelect?: (id: string) => void
  /** Layout (`'horizontal'` until an input says otherwise). */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string

  /** The translation function, captured in the injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The tools to render (React's default parameter: a later-bound write of
   * `undefined` must not erase the default list).
   * @returns The tool list.
   */
  toolList(): DrawingTool[] {
    return this.tools ?? DEFAULT_TOOLS
  }

  /**
   * Computes the toolbar class list (React's
   * `cm.cn(orientation === 'vertical' ? cm.stack(1) : cm.flex({ align: 'center', gap: 'xs' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      (this.orientation ?? 'horizontal') === 'vertical'
        ? cm.stack(1)
        : cm.flex({ align: 'center', gap: 'xs' }),
      this.className,
    )
  }

  /**
   * The translated toolbar label (React's `t('drawingToolbar.label', {}, …)`).
   * @returns The label text.
   */
  label(): string {
    return this.i18n.t('drawingToolbar.label', {}, { defaultValue: 'Drawing tools' })
  }

  /**
   * The first character of a tool's label — React's iconless fallback.
   * @param label - The tool's label.
   * @returns The first character, or `undefined` for an empty label.
   */
  firstChar(label: string): string | undefined {
    return label[0]
  }

  /**
   * Calls `onSelect` with the clicked tool's id (React's `onClick`).
   * @param tool - The tool whose button was clicked.
   */
  select(tool: DrawingTool): void {
    this.onSelect?.(tool.id)
  }

  /**
   * Whether the value is a node template (a node-valued prop's Angular
   * representation). Checked structurally — `TemplateRef` is a type-only
   * import here, and the check must survive any bundler.
   * @param value - The prop value.
   * @returns True for a template ref.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'
    )
  }
}
