/**
 * DangerZoneSection component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import { hasNodes, SlotWrapper } from './slot-dom.js'

/**
 * DangerZoneSection component.
 *
 * Card-wrapped section for destructive actions — delete account, reset data,
 * revoke access. Uses the error/danger accent color and puts the action on
 * the right. The host IS the Card's `<div>`
 * (`div[mol-danger-zone-section]`), matching React's root exactly; the Card
 * classes (`cm.card({ variant: 'elevated' })` + `cm.cardPadding('md')`, the
 * UI Card's defaults) are applied through the host class binding.
 *
 * The node props are projected slots: `title` renders inside the `<h3>`,
 * `description` inside the `<p>`, `actionLabel` inside the action `<button>`,
 * and `children` bare between the header and the button row (React renders
 * `{children}` with no wrapper). String inputs render as text instead — the
 * same values React renders. The action label's capture wrapper detaches
 * while `loading` is true: React shows the `…` glyph instead of the label.
 */
@Component({
  selector: 'div[mol-danger-zone-section]',
  standalone: true,
  imports: [Button],
  inputs: [
    'title',
    'description',
    'actionLabel',
    'loading',
    'disabled',
    'className',
    'dataMolId',
    'onAction',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div [class]="cm().stack(3)">
    <header [class]="cm().stack(1)">
      <h3 [class]="titleClasses()">
        {{ titleText() }}<ng-content select="[slot=title]"></ng-content>
      </h3>
      <p [class]="cm().textSize('sm')">
        {{ descriptionText() }}<ng-content select="[slot=description]"></ng-content>
      </p>
    </header>
    <ng-content></ng-content>
    <div [class]="cm().flex({ justify: 'end' })">
      <button
        mol-button
        [variant]="'solid'"
        [color]="'error'"
        [disabled]="isDisabled()"
        (click)="handleAction($event)"
      >
        {{ loading ? '…' : actionLabelText()
        }}<span #labelSlot><ng-content select="[slot=actionLabel]"></ng-content></span>
      </button>
    </div>
  </div>`,
})
export class DangerZoneSection implements AfterViewInit, DoCheck {
  /** Section title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Explanation of the destructive action (string/number as text; nodes are `[slot=description]` content). */
  description?: unknown
  /** Label on the action button (string/number as text; nodes are `[slot=actionLabel]` content). */
  actionLabel?: unknown
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Called when the button is clicked; receives the DOM click event (React's `onAction`). */
  onAction?: (event: MouseEvent) => void

  /** The action label's capture wrapper (moved out of the DOM once read). */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>

  /** Whether the action label slot holds projected content (read once). */
  private hasLabelSlot = false

  /** The capture wrapper's parent (the action `<button>`), remembered across detaches. */
  private labelParent?: Node

  /** The projected label nodes while they render bare (React's `{actionLabel}`). */
  private labelNodes: Node[] = []

  /** Marks the wrapper's position in the button while the projected nodes render bare. */
  private labelAnchor?: Comment

  /** The wrapper sync for the action label's capture wrapper. */
  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

  /** Creates the position anchor comment the DOM normalizer strips. */
  private readonly renderer = inject(Renderer2)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the Card's class list (`cm.card({ variant: 'elevated' })` +
   * `cm.cardPadding('md')` — the UI Card's defaults — plus `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.className,
    )
  }

  /**
   * Computes the title's class (`cm.textSize('base')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The title input's text (React's `{title}` for a text child: strings and
   * numbers render; a node arrives as `[slot=title]` content instead).
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? String(this.title)
      : ''
  }

  /**
   * The description input's text (React's `{description}` for a text child).
   * @returns The text, or `''` for a node description.
   */
  descriptionText(): string {
    return typeof this.description === 'string' || typeof this.description === 'number'
      ? String(this.description)
      : ''
  }

  /**
   * The action label input's text (React's `{actionLabel}` for a text child).
   * @returns The text, or `''` for a node label.
   */
  actionLabelText(): string {
    return typeof this.actionLabel === 'string' || typeof this.actionLabel === 'number'
      ? String(this.actionLabel)
      : ''
  }

  /**
   * The button's disabled state (React's `disabled || loading`; an absent
   * boolean input must not show a disabled button).
   * @returns Whether the button is disabled.
   */
  isDisabled(): boolean {
    return this.disabled === true || this.loading === true
  }

  /** Runs the click handler the way React forwards the DOM event. */
  handleAction(event: MouseEvent): void {
    this.onAction?.(event)
  }

  /**
   * Reads the label slot's presence (view queries resolve only at view init)
   * and syncs the capture wrapper against React's DOM.
   */
  ngAfterViewInit(): void {
    const label = this.labelSlot?.nativeElement
    if (label) {
      this.labelParent = label.parentElement ?? undefined
      this.hasLabelSlot = hasNodes(label)
    }
    this.syncLabels()
  }

  /**
   * Re-syncs the wrapper when `loading` changes.
   */
  ngDoCheck(): void {
    this.syncLabels()
  }

  /**
   * Applies React's label branch: the projected label renders only while
   * there is one and the button is not loading (`{loading ? '…' : actionLabel}`),
   * and it renders BARE — the capture wrapper never shows in the DOM.
   */
  private syncLabels(): void {
    const span = this.labelSlot?.nativeElement
    const parent = this.labelParent
    if (!span || !parent) return
    if (this.hasLabelSlot && this.loading !== true) {
      this.unwrapLabel(span, parent)
    } else {
      this.wrapLabel(span, parent)
    }
  }

  /**
   * Moves the projected nodes out of the capture wrapper to its position and
   * detaches the empty wrapper (React renders the label with no element).
   *
   * @param span - The capture wrapper.
   * @param parent - The wrapper's parent (the action `<button>`).
   */
  private unwrapLabel(span: HTMLSpanElement, parent: Node): void {
    const anchor = this.labelAnchor ?? this.createLabelAnchor(parent, span)
    this.labelNodes = Array.from(span.childNodes)
    for (const node of this.labelNodes) parent.insertBefore(node, anchor)
    if (span.isConnected) parent.removeChild(span)
  }

  /**
   * Creates the position anchor comment and inserts it where the wrapper sits.
   *
   * @param parent - The wrapper's parent (the action `<button>`).
   * @param span - The capture wrapper the anchor replaces.
   * @returns The created anchor comment.
   */
  private createLabelAnchor(parent: Node, span: Node): Comment {
    const anchor: Comment = this.renderer.createComment('slot')
    this.labelAnchor = anchor
    parent.insertBefore(anchor, span)
    return anchor
  }

  /**
   * Puts the projected nodes back inside the capture wrapper (hidden, as
   * React hides the label while loading) and keeps the wrapper out of the DOM.
   *
   * @param span - The capture wrapper.
   * @param parent - The wrapper's parent (the action `<button>`).
   */
  private wrapLabel(span: HTMLSpanElement, parent: Node): void {
    for (const node of this.labelNodes) span.appendChild(node)
    this.labelNodes = []
    if (!span.isConnected && this.labelAnchor?.isConnected) {
      parent.insertBefore(span, this.labelAnchor)
    }
    this.sync.sync(span, false, parent)
  }
}
