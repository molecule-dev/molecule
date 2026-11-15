/**
 * IntegrationCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  Renderer2,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, styleText } from '@molecule/app-ui-angular'

import { hasNodes, SlotGuard } from './slot-dom.js'
import type { IntegrationCardProps, IntegrationStatus } from './types.js'

/** Action button configuration (React's `action` prop shape). */
type IntegrationCardAction = NonNullable<IntegrationCardProps['action']>

/** The integration card's gradient overlay for the `cta` variant. */
const CTA_GRADIENT =
  'linear-gradient(135deg, var(--color-primary, #4070e0), var(--color-primary-container, #6b8fe8))'

/**
 * Whether a value is one of the case's projected node templates (`{ $nodes }`
 * inside a data prop becomes a `TemplateRef`).
 *
 * @param value - The prop value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * Whether a value renders as plain text (React renders strings and numbers,
 * and nothing for `null` / booleans).
 *
 * @param value - The prop value.
 * @returns True when the value renders as text.
 */
const hasText = (value: unknown): boolean =>
  typeof value === 'number' || (typeof value === 'string' && value !== '')

/**
 * IntegrationCard component.
 *
 * Card for an integration / external connection (Slack, Stripe, Google Drive,
 * bank-link CTAs, etc.) — icon + title + description + status label + action.
 * The host IS the Card `div` (`div[mol-integration-card]`), matching React's
 * root exactly: the card's ClassMap classes, the `cta` gradient style and
 * `data-mol-id` are the host's.
 *
 * Node props (`icon`, `title`, `description`) are projected content
 * (`[slot=<name>]`) or plain string inputs; `action.label` may be a projected
 * node template. The optional icon / description wrappers and the action
 * anchor/button render only when React would render them — Angular projection
 * needs always-mounted capture points, so
 * {@link IntegrationCard.ngAfterViewChecked} reconciles them.
 */
@Component({
  selector: 'div[mol-integration-card]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: ['icon', 'title', 'description', 'status', 'action', 'variant', 'className', 'dataMolId'],
  host: {
    '[class]': 'cardClasses()',
    '[style]': 'hostStyle()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div [class]="rowClasses()"><div #iconWrap [class]="iconClasses()">@if (hasIconText()) {<ng-container>{{ icon }}</ng-container>}@if (iconTemplate(); as iconTpl) {<ng-container [ngTemplateOutlet]="iconTpl" />}<ng-content select="[slot=icon]"></ng-content></div><div [class]="bodyClasses()"><h3 [class]="titleClasses()">@if (hasTitleText()) {<ng-container>{{ title }}</ng-container>}@if (titleTemplate(); as titleTpl) {<ng-container [ngTemplateOutlet]="titleTpl" />}<ng-content select="[slot=title]"></ng-content></h3><p #descriptionWrap [class]="descriptionClasses()">@if (hasDescriptionText()) {<ng-container>{{ description }}</ng-container>}@if (descriptionTemplate(); as descriptionTpl) {<ng-container [ngTemplateOutlet]="descriptionTpl" />}<ng-content select="[slot=description]"></ng-content></p><div #statusRow [class]="statusRowClasses()"><span [class]="statusClasses()">{{ statusLabel() }}</span><a #actionAnchor [attr.href]="action?.href ?? null"></a><button #actionButton mol-button [disabled]="buttonDisabled()" (click)="runAction($event)">@if (showEllipsis()) {<ng-container>…</ng-container>}@else if (actionLabelTemplate(); as labelTpl) {<ng-container [ngTemplateOutlet]="labelTpl" />}@else {<ng-container>{{ actionLabelText() }}</ng-container>}</button></div></div></div>`,
})
export class IntegrationCard implements AfterViewInit, AfterViewChecked {
  /** Leading icon / logo — a string input, or `[slot=icon]` projected content. */
  icon?: unknown
  /** Integration title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Supporting description — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Current connection status (defaults to `'disconnected'` at read time). */
  status?: IntegrationStatus
  /** Action button configuration (its `label` may be a projected node template). */
  action?: IntegrationCardAction | null
  /** `'card'` default, `'cta'` for premium gradient-tinted promos. */
  variant?: 'card' | 'cta'
  /** Extra classes on the card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The optional icon wrapper (detached when React would render none). */
  @ViewChild('iconWrap') private iconWrap?: ElementRef<HTMLElement>
  /** The optional description paragraph. */
  @ViewChild('descriptionWrap') private descriptionWrap?: ElementRef<HTMLElement>
  /** The status row (the action's home when it is not a link). */
  @ViewChild('statusRow') private statusRow?: ElementRef<HTMLElement>
  /** The action's anchor (present only when `action.href` is set). */
  @ViewChild('actionAnchor') private actionAnchor?: ElementRef<HTMLAnchorElement>
  /** The action button (its element: the host also carries the UI Button component). */
  @ViewChild('actionButton', { read: ElementRef })
  private actionButton?: ElementRef<HTMLButtonElement>

  /** The i18n provider above the card (the status label). */
  private readonly i18n = useTranslation()

  /** Whether the projected slots' presence has been read (read once: projection never changes). */
  private readonly slotsRead = signal(false)
  /** Whether the icon slot holds content. */
  private readonly iconProjected = signal(false)
  /** Whether the description slot holds content. */
  private readonly descriptionProjected = signal(false)

  private readonly renderer = inject(Renderer2)
  private readonly guard = new SlotGuard(inject(ElementRef), this.renderer)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The card's class list (React's `Card` with no variant: the elevated card
   * plus medium padding, then `className`).
   * @returns The class string.
   */
  cardClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The `cta` gradient, serialized as React's inline style writes it.
   * @returns The style attribute text, or null.
   */
  hostStyle(): string | null {
    return styleText(
      (this.variant ?? 'card') === 'cta' ? { backgroundImage: CTA_GRADIENT } : undefined,
    )
  }

  /**
   * The icon + body row's class list (`cm.flex({ align: 'start', gap: 'md' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'start', gap: 'md' })
  }

  /**
   * The icon wrapper's class (`cm.shrink0`).
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The body column's class list (`cm.cn(cm.flex1, cm.stack(2))`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(2))
  }

  /**
   * The title's class list (`cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The description's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The status row's class list
   * (`cm.flex({ align: 'center', justify: 'between', gap: 'sm' })`).
   * @returns The class string.
   */
  statusRowClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * The status label's class list (`cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  statusClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The translated status label (React's `integrationCard.status.*` keys).
   * @returns The label text.
   */
  statusLabel(): string {
    const status: IntegrationStatus = this.status ?? 'disconnected'
    return status === 'connected'
      ? this.i18n.t('integrationCard.status.connected', {}, { defaultValue: 'Connected' })
      : status === 'pending'
        ? this.i18n.t('integrationCard.status.pending', {}, { defaultValue: 'Connecting…' })
        : status === 'error'
          ? this.i18n.t('integrationCard.status.error', {}, { defaultValue: 'Error' })
          : this.i18n.t(
              'integrationCard.status.disconnected',
              {},
              { defaultValue: 'Not connected' },
            )
  }

  /**
   * Whether the icon input renders as text.
   * @returns True when it renders as text.
   */
  hasIconText(): boolean {
    return hasText(this.icon)
  }

  /**
   * Whether the title input renders as text.
   * @returns True when it renders as text.
   */
  hasTitleText(): boolean {
    return hasText(this.title)
  }

  /**
   * Whether the description input renders as text.
   * @returns True when it renders as text.
   */
  hasDescriptionText(): boolean {
    return hasText(this.description)
  }

  /**
   * The icon as a projected node template, when the caller passed one.
   * @returns The icon template, or null.
   */
  iconTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.icon) ? this.icon : null
  }

  /**
   * The title as a projected node template, when the caller passed one.
   * @returns The title template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.title) ? this.title : null
  }

  /**
   * The description as a projected node template, when the caller passed one.
   * @returns The description template, or null.
   */
  descriptionTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.description) ? this.description : null
  }

  /**
   * The action label as a projected node template, when the caller passed one.
   * @returns The label template, or null.
   */
  actionLabelTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.action?.label) ? (this.action?.label as TemplateRef<unknown>) : null
  }

  /**
   * The action label's text (React renders strings and numbers).
   * @returns The label text.
   */
  actionLabelText(): string {
    const label = this.action?.label
    return typeof label === 'string' || typeof label === 'number' ? String(label) : ''
  }

  /**
   * React's loading ellipsis: only the button branch replaces its label.
   * @returns Whether the ellipsis glyph renders.
   */
  showEllipsis(): boolean {
    return Boolean(this.action && !this.action.href && this.action.loading)
  }

  /**
   * React's `disabled` for the action button: the link branch ignores
   * `loading`, the button branch ORs it in.
   * @returns Whether the button is disabled.
   */
  buttonDisabled(): boolean {
    if (!this.action) return false
    return this.action.href
      ? Boolean(this.action.disabled)
      : Boolean(this.action.disabled) || Boolean(this.action.loading)
  }

  /**
   * React's `icon && <div>`: a text/template input or a projected `[slot=icon]`.
   * @returns Whether the icon wrapper renders.
   */
  showIcon(): boolean {
    return this.hasIconText() || this.iconTemplate() !== null || this.iconProjected()
  }

  /**
   * React's `description && <p>`: a text/template input or projected content.
   * @returns Whether the description paragraph renders.
   */
  showDescription(): boolean {
    return (
      this.hasDescriptionText() ||
      this.descriptionTemplate() !== null ||
      this.descriptionProjected()
    )
  }

  /**
   * Calls the action's `onClick` with the click event, as React's DOM handler
   * does — only on the button branch (the link branch has no handler).
   *
   * @param event - The native click event.
   */
  runAction(event: Event): void {
    if (this.action && !this.action.href) this.action.onClick?.(event)
  }

  /** Reads the projected slots' presence once, then reconciles the wrappers. */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after every view refresh (a props step may add or remove a
   * value): the wrappers are toggled on the values the template just rendered.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Reads the projected slots' presence once (while no input rendered into the
   * wrapper, so only projected content counts), then toggles the optional
   * wrappers and places the action the way React nests it.
   */
  private reconcile(): void {
    const icon = this.iconWrap?.nativeElement
    const description = this.descriptionWrap?.nativeElement
    if (!this.slotsRead()) {
      if (icon) {
        this.iconProjected.set(
          !this.hasIconText() && this.iconTemplate() === null ? hasNodes(icon) : false,
        )
      }
      if (description) {
        this.descriptionProjected.set(
          !this.hasDescriptionText() && this.descriptionTemplate() === null
            ? hasNodes(description)
            : false,
        )
      }
      this.slotsRead.set(true)
    }
    this.guard.toggle(icon, this.showIcon())
    this.guard.toggle(description, this.showDescription())
    this.syncAction()
  }

  /**
   * Places the action the way React nests it: an anchor around the button when
   * `action.href` is set, the button alone in the status row otherwise, and
   * neither when there is no action.
   */
  private syncAction(): void {
    const row = this.statusRow?.nativeElement
    const anchor = this.actionAnchor?.nativeElement
    const button = this.actionButton?.nativeElement
    if (!row || !anchor || !button) return
    if (!this.action) {
      if (button.isConnected) this.renderer.removeChild(button.parentNode!, button)
      if (anchor.isConnected) this.renderer.removeChild(anchor.parentNode!, anchor)
      return
    }
    if (this.action.href) {
      row.appendChild(anchor)
      anchor.appendChild(button)
      return
    }
    row.appendChild(button)
    if (anchor.isConnected) this.renderer.removeChild(anchor.parentNode!, anchor)
  }
}
