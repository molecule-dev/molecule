/**
 * CollapsibleSection component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type ElementRef,
  type OnInit,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Whether a node-valued prop is an Angular template (a `{ $nodes }` value)
 * rather than plain text. Checked structurally — `TemplateRef` is a type-only
 * import in the emitted metadata, so `instanceof` is not dependable across
 * bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `''` when there is nothing.
 */
const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * CollapsibleSection component.
 *
 * Expandable section with a clickable heading. Lighter-weight than an
 * accordion — renders a single toggle, not a group of panels. The host IS the
 * root `<section>` (`section[mol-collapsible-section]`), matching React's root
 * exactly.
 *
 * Node props are projected content (`[slot=title]`, `[slot=badge]`,
 * `[slot=actions]`, and the default projection for the body) or template refs
 * on the same-named inputs, as in `@molecule/app-announcement-bar-angular`.
 * React renders the body `<div>` only while expanded and the actions `<span>`
 * only when `actions` is given; Angular projects into always-mounted capture
 * points, so {@link CollapsibleSection.reconcile} detaches and restores those
 * wrappers to match.
 */
@Component({
  selector: 'section[mol-collapsible-section]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: [
    'title',
    'badge',
    'actions',
    'expanded',
    'defaultExpanded',
    'onExpandedChange',
    'level',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  template: `@switch (levelTag()) {
      @case (2) {
        <h2><ng-container [ngTemplateOutlet]="headingBody" /></h2>
      }
      @case (4) {
        <h4><ng-container [ngTemplateOutlet]="headingBody" /></h4>
      }
      @case (5) {
        <h5><ng-container [ngTemplateOutlet]="headingBody" /></h5>
      }
      @case (6) {
        <h6><ng-container [ngTemplateOutlet]="headingBody" /></h6>
      }
      @default {
        <h3><ng-container [ngTemplateOutlet]="headingBody" /></h3>
      }
    }
    <div #bodyWrap><ng-content></ng-content></div>
    <ng-template #headingBody>
      <!-- The header row is a container, not a button: a button may not
           contain other controls, and "actions" typically holds them. The
           toggle wraps the label; "actions" sits beside it, so a click there
           never reaches the toggle (no stopPropagation needed). -->
      <span [class]="headerClasses()">
        <button
          type="button"
          (click)="toggle()"
          [attr.aria-expanded]="isOpen() ? 'true' : 'false'"
          [class]="buttonClasses()"
        >
          <span aria-hidden="true">{{ isOpen() ? '▾' : '▸' }}</span>
          <span
            ><ng-content select="[slot=title]"></ng-content>
            @if (titleTemplate(); as titleTpl) {
              <ng-container [ngTemplateOutlet]="titleTpl" />
            } @else if (titleText()) {
              {{ title }}
            }
          </span>
          <ng-content select="[slot=badge]"></ng-content>
          @if (badgeTemplate(); as badgeTpl) {
            <ng-container [ngTemplateOutlet]="badgeTpl" />
          } @else if (badgeText()) {
            {{ badge }}
          }
        </button>
        <span #actionsWrap
          ><ng-content select="[slot=actions]"></ng-content>
          @if (actionTemplate(); as actionTpl) {
            <ng-container [ngTemplateOutlet]="actionTpl" />
          } @else if (actionText()) {
            {{ actions }}
          }
        </span>
      </span>
    </ng-template>`,
})
export class CollapsibleSection implements OnInit {
  /** Section heading — text, a template ref, or `[slot=title]` content. */
  title?: TemplateRef<unknown> | string | null
  /** Optional badge / count — text, a template ref, or `[slot=badge]` content. */
  badge?: TemplateRef<unknown> | string | null
  /** Optional right-side actions — text, a template ref, or `[slot=actions]` content. */
  actions?: TemplateRef<unknown> | string | null
  /** Controlled expansion — when provided, overrides internal state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled (defaults to false at read time). */
  defaultExpanded?: boolean
  /** Called when expansion state changes (React's `onExpandedChange`). */
  onExpandedChange?: (expanded: boolean) => void
  /** Heading level (defaults to 3 at read time). */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string

  /** The body `<div>` (detached while collapsed, as React renders it conditionally). */
  @ViewChild('bodyWrap') bodyWrap?: ElementRef<HTMLElement>
  /** The actions `<span>` (detached when there are no actions). */
  @ViewChild('actionsWrap') actionsWrap?: ElementRef<HTMLElement>

  /** Expansion state while the section is uncontrolled (React's `useState`). */
  private readonly internal = signal(false)
  /** Whether `[slot=actions]` content was projected. */
  private hasActionsSlot = false

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /** Reads React's `useState(defaultExpanded)` initial value, once inputs are bound. */
  ngOnInit(): void {
    this.internal.set(this.defaultExpanded ?? false)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root section's class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * Computes the header row's class list — the container `<span>` that holds
   * the toggle button and the actions (React's old button class list).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
      this.cm().w('full'),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      this.cm().fontWeight('semibold'),
    )
  }

  /**
   * Computes the toggle button's class list (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * Whether the section is expanded (React's `expanded ?? internal`).
   * @returns True while expanded.
   */
  isOpen(): boolean {
    return this.expanded ?? this.internal()
  }

  /**
   * The heading level React renders (`h${level}`, default 3).
   * @returns The heading level the template's tag switch picks.
   */
  levelTag(): number {
    const level = this.level
    return level === 2 || level === 4 || level === 5 || level === 6 ? level : 3
  }

  /**
   * Toggles expansion state, updating internal state when uncontrolled, and
   * calls `onExpandedChange` with the next state — React's `toggle`.
   */
  toggle(): void {
    const next = !this.isOpen()
    if (this.expanded === undefined) this.internal.set(next)
    this.onExpandedChange?.(next)
  }

  /**
   * The heading as a template, when the caller passed a node.
   * @returns The heading template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.title) ? this.title : null
  }

  /**
   * The heading input's text (React renders strings and numbers; a node is projected instead).
   * @returns The text, or `''`.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? textOf(this.title)
      : ''
  }

  /**
   * The badge as a template, when the caller passed a node.
   * @returns The badge template, or null.
   */
  badgeTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.badge) ? this.badge : null
  }

  /**
   * The badge input's text (React renders strings and numbers; a node is projected instead).
   * @returns The text, or `''`.
   */
  badgeText(): string {
    return typeof this.badge === 'string' || typeof this.badge === 'number'
      ? textOf(this.badge)
      : ''
  }

  /**
   * The actions as a template, when the caller passed a node.
   * @returns The actions template, or null.
   */
  actionTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.actions) ? this.actions : null
  }

  /**
   * The actions input's text (React renders strings and numbers; a node is projected instead).
   * @returns The text, or `''`.
   */
  actionText(): string {
    return typeof this.actions === 'string' || typeof this.actions === 'number'
      ? textOf(this.actions)
      : ''
  }

  /**
   * Whether React's `actions && <span>…` branch renders: the input decides it
   * by its own truthiness when given, the `[slot=actions]` projection otherwise.
   * @returns True when the actions wrapper renders.
   */
  actionsContent(): boolean {
    if (this.actions !== undefined && this.actions !== null) return Boolean(this.actions)
    return this.hasActionsSlot
  }

  /**
   * Applies React's conditions: the actions `<span>` renders only with actions,
   * the body `<div>` only while expanded.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const actions = this.actionsWrap?.nativeElement
    if (actions) this.hasActionsSlot = hasContent(actions)
    setElementPresent(actions, this.actionsContent())
    setElementPresent(this.bodyWrap?.nativeElement, this.isOpen())
  }
}
