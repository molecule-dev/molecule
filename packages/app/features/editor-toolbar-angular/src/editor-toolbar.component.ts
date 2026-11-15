/**
 * EditorToolbar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { ToolbarAction } from './types.js'

/** React's sticky inline style, written to the DOM the way React writes it. */
const STICKY_STYLE = 'position: sticky; top: 0px; z-index: 10'

/** React's divider inline style, written to the DOM the way React writes it. */
const DIVIDER_STYLE = 'width: 1px; height: 24px; opacity: 0.2; background: currentColor'

/**
 * EditorToolbar component.
 *
 * Editor-page top toolbar — title + optional version/status badge + primary
 * actions (Save, Publish, Test) + secondary icon actions. The host IS the
 * root `<div>` (`div[mol-editor-toolbar]`), matching React's root exactly.
 * The title row and actions row use React's ClassMap tokens, the 1px divider
 * renders between non-empty primary and secondary groups, and the sticky
 * inline style applies by default (`sticky` defaults to true). Action
 * `label`s render verbatim — the component has no `t()` calls of its own.
 *
 * Node props (`title`, `badge`, `leading`) are projected content
 * (`[slot=title]`, `[slot=badge]`, `[slot=leading]`) — an input cannot carry
 * a node. An action's node fields (`label`, `icon`) are template refs from a
 * data prop, rendered through `ngTemplateOutlet`. Angular's `@for` tracks the
 * action's `id`, the way React keys its button lists.
 */
@Component({
  selector: 'div[mol-editor-toolbar]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: ['primaryActions', 'secondaryActions', 'sticky', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    '[style]': 'stickyStyle()',
  },
  template: `<div [class]="titleRowClasses()">
      <ng-content select="[slot=leading]"></ng-content>
      <h1 [class]="headingClasses()"><ng-content select="[slot=title]"></ng-content></h1>
      <ng-content select="[slot=badge]"></ng-content>
    </div>
    <div [class]="actionsRowClasses()">
      @for (action of primaryList(); track action.id) {
        @if (action.href) {
          <a [attr.href]="action.href">
            <ng-container
              [ngTemplateOutlet]="actionButton"
              [ngTemplateOutletContext]="context(action)"
            />
          </a>
        } @else {
          <ng-container
            [ngTemplateOutlet]="actionButton"
            [ngTemplateOutletContext]="context(action)"
          />
        }
      }
      @if (showDivider()) {
        <span aria-hidden="true" [style]="dividerStyle"></span>
      }
      @for (action of secondaryList(); track action.id) {
        @if (action.href) {
          <a [attr.href]="action.href">
            <ng-container
              [ngTemplateOutlet]="actionButton"
              [ngTemplateOutletContext]="context(action)"
            />
          </a>
        } @else {
          <ng-container
            [ngTemplateOutlet]="actionButton"
            [ngTemplateOutletContext]="context(action)"
          />
        }
      }
    </div>
    <ng-template #actionButton let-action>
      <button
        mol-button
        [variant]="action.variant ?? 'ghost'"
        [color]="action.color ?? 'primary'"
        [disabled]="action.disabled ?? false"
        (click)="runAction(action, $event)"
      >
        @if (isTemplate(action.icon)) {
          <ng-container [ngTemplateOutlet]="action.icon" />
        } @else if (action.icon) {
          {{ action.icon }}
        }
        @if (action.label) {
          <span>
            @if (isTemplate(action.label)) {
              <ng-container [ngTemplateOutlet]="action.label" />
            } @else {
              {{ action.label }}
            }
          </span>
        }
      </button>
    </ng-template>`,
})
export class EditorToolbar {
  /** Primary actions (e.g. Save, Publish) rendered on the right. */
  primaryActions?: ToolbarAction[]
  /** Secondary icon-only actions (theme, settings, help). */
  secondaryActions?: ToolbarAction[]
  /** Sticky top (defaults to true at read time). */
  sticky?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** React's divider inline style text. */
  readonly dividerStyle = DIVIDER_STYLE

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (React's
   * `cm.cn(cm.flex({ align, justify, gap, wrap }), cm.sp('px', 4), cm.sp('py', 2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
      this.cm().sp('px', 4),
      this.cm().sp('py', 2),
      this.className,
    )
  }

  /**
   * The title row's class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  titleRowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The heading's class (`cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The actions row's class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  actionsRowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The primary actions to render (React's `primaryActions = []` default: a
   * later-bound write of `undefined` must not erase it).
   * @returns The action list.
   */
  primaryList(): ToolbarAction[] {
    return this.primaryActions ?? []
  }

  /**
   * The secondary actions to render (React's `secondaryActions = []` default).
   * @returns The action list.
   */
  secondaryList(): ToolbarAction[] {
    return this.secondaryActions ?? []
  }

  /**
   * Whether React renders the divider — only when both groups are non-empty.
   * @returns True when the divider renders.
   */
  showDivider(): boolean {
    return this.secondaryList().length > 0 && this.primaryList().length > 0
  }

  /**
   * The toolbar's inline style text (React's
   * `style={sticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}`);
   * null when not sticky, so no `style` attribute renders.
   * @returns The style text or null.
   */
  stickyStyle(): string | null {
    return (this.sticky ?? true) ? STICKY_STYLE : null
  }

  /**
   * The `ngTemplateOutlet` context for one action.
   * @param action - The action to expose to the button template.
   * @returns The context object.
   */
  context(action: ToolbarAction): { $implicit: ToolbarAction } {
    return { $implicit: action }
  }

  /**
   * Runs one action's callback (React passes the click event through).
   * @param action - The action whose button was clicked.
   * @param event - The native click event.
   */
  runAction(action: ToolbarAction, event: MouseEvent): void {
    action.onClick?.(event)
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
