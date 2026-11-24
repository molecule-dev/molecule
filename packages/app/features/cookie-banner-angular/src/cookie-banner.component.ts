/**
 * CookieBanner component (React parity).
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
  placeContent,
  rendersNode,
  setElementPresent,
  type SlotReader,
  useHostPresence,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, styleText, Switch } from '@molecule/app-ui-angular'

import type { CookieCategory } from './types.js'

/** React's inline style for the banner, serialized the way React writes it. */
const BANNER_STYLE: Record<string, unknown> = {
  position: 'fixed',
  left: 16,
  right: 16,
  bottom: 16,
  zIndex: 60,
  background: 'var(--color-surface, #fff)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 12,
  boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
  maxWidth: 720,
  marginLeft: 'auto',
  marginRight: 'auto',
}

/**
 * Whether a value is one of the cases' projected node templates (a
 * `{ $nodes }` value inside a data prop becomes a `TemplateRef`).
 *
 * @param value - The field value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * CookieBanner component.
 *
 * GDPR / cookie-consent banner: two modes, Accept / Reject only or per-category
 * switches behind "Customize" when `categories` are supplied. The host IS the
 * root `<div>` (`div[mol-cookie-banner]`), matching React's root exactly, so the
 * banner's ClassMap classes, `role`, `aria-label` and inline style are the
 * host's.
 *
 * React renders `null` while `visible` is false — Angular's host element always
 * exists, so `useHostPresence` takes it out of the page in that state (no
 * element is left behind, matching React's null) and puts it back when the
 * banner is shown again. The node props are projected slots: `title` renders
 * inside the `<h3>`, `description` inside the `<p>`; plain string inputs render
 * as text instead, the same values React renders.
 */
@Component({
  selector: 'div[mol-cookie-banner]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, NgTemplateOutlet, Switch],
  inputs: [
    'categories',
    'onAcceptAll',
    'onRejectAll',
    'onSave',
    'title',
    'description',
    'policyHref',
    'visible',
    'onDismiss',
    'className',
  ],
  host: {
    role: 'dialog',
    '[attr.aria-label]': 'ariaLabel()',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
  },
  // prettier-ignore
  template: `<header [class]="cm().stack(1)"><h3 #titleHeading [class]="titleClasses()"><span #titleFallback>{{ titleText() }}</span><span #titleSlot><ng-content select="[slot=title]"></ng-content></span></h3><p #descriptionHeading [class]="cm().textSize('sm')"><span #descriptionFallback>{{ descriptionText() }}</span><span #descriptionSlot><ng-content select="[slot=description]"></ng-content></span>@if (policyHref) {<ng-container>{{ leadingSpace }}</ng-container><a [class]="cm().link" [attr.href]="policyHref">{{ learnMoreText() }}</a>.}</p></header>@if (showDetails && hasCategories()) {<div [attr.id]="detailsId" [class]="cm().stack(2)">@for (category of categories ?? []; track category.id; let i = $index) {<div [class]="rowClasses()"><div [class]="textColumnClasses()"><span [attr.id]="labelId(i)" [class]="labelClasses()">@if (isTemplate(category.label)) {<ng-container [ngTemplateOutlet]="asTemplate(category.label)" />} @else {{{ category.label }}}</span>@if (category.description) {<span [attr.id]="descriptionId(i)" [class]="cm().textSize('xs')">@if (isTemplate(category.description)) {<ng-container [ngTemplateOutlet]="asTemplate(category.description)" />} @else {{{ category.description }}}</span>}</div><mol-switch [checked]="isChecked(category)" [disabled]="category.required === true" [attr.aria-labelledby]="labelId(i)" [attr.aria-describedby]="category.description ? descriptionId(i) : null" (change)="toggle(category, $event)"></mol-switch></div>}</div>}<footer [class]="footerClasses()">@if (hasCategories()) {<button mol-button [variant]="'ghost'" [size]="'sm'" [attr.aria-expanded]="showDetails" [attr.aria-controls]="showDetails && hasCategories() ? detailsId : null" (click)="toggleDetails()">{{ detailsLabel() }}</button>}<button mol-button [variant]="'ghost'" (click)="reject()">{{ rejectText() }}</button>@if (saveVisible()) {<button mol-button [variant]="'outline'" (click)="save()">{{ saveText() }}</button>}<button mol-button [variant]="'solid'" [color]="'primary'" (click)="accept()">{{ acceptText() }}</button></footer>`,
})
export class CookieBanner implements OnInit {
  /** Cookie categories to offer (omit for a simple accept/reject banner). */
  categories?: CookieCategory[]
  /** Called when accept-all is clicked. */
  onAcceptAll?: () => void
  /** Called when reject-non-essential is clicked. */
  onRejectAll?: () => void
  /** Called when "Save preferences" is clicked. */
  onSave?: (enabled: Record<string, boolean>) => void
  /** Optional title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Optional description (string/number as text; nodes are `[slot=description]` content). */
  description?: unknown
  /** Privacy policy link URL. */
  policyHref?: string
  /** Whether the banner is visible (controlled; true unless this is `false`). */
  visible?: boolean
  /** Called when dismissed via Save / Accept / Reject. */
  onDismiss?: () => void
  /** Extra classes. */
  className?: string

  /** The title heading (the element the title's capture point is unwrapped into). */
  @ViewChild('titleHeading') titleHeading?: ElementRef<HTMLElement>
  /** The title's text capture point. */
  @ViewChild('titleFallback') titleFallback?: ElementRef<HTMLElement>
  /** The title's projected-nodes capture point. */
  @ViewChild('titleSlot') titleSlot?: ElementRef<HTMLElement>
  /** The description paragraph (the element the description's capture point is unwrapped into). */
  @ViewChild('descriptionHeading') descriptionHeading?: ElementRef<HTMLElement>
  /** The description's text capture point. */
  @ViewChild('descriptionFallback') descriptionFallback?: ElementRef<HTMLElement>
  /** The description's projected-nodes capture point. */
  @ViewChild('descriptionSlot') descriptionSlot?: ElementRef<HTMLElement>

  /** Whether the user opened the granular details (React's `showDetails`). */
  showDetails = false

  /** React's `{' '}` between the description and the policy link. */
  readonly leadingSpace = ' '

  /** Per-instance counter backing the generated ids (React numbers `useId()` ids). */
  private static nextId = 0
  /** The details list's id, which the Customize/Hide details button's `aria-controls` names while the list renders. */
  readonly detailsId = `mol-cookie-banner-details-${CookieBanner.nextId++}`
  /** Base of each category row's label/description ids, which name and describe that row's switch. */
  private readonly nameBase = `mol-cookie-banner-name-${CookieBanner.nextId++}`

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  /** React's `useState` map: captured once, at mount. */
  private readonly enabled = new Map<string, boolean>()

  /** Whether `[slot=title]` content is projected (read from the placement function). */
  private readonly hasTitleSlot = signal(false)
  /** Whether `[slot=description]` content is projected (read from the placement function). */
  private readonly hasDescriptionSlot = signal(false)

  constructor() {
    // Leaves no element in the page while `visible` is false (React renders null).
    useHostPresence(() => this.visible !== false)
    usePlacement((hasContent) => this.applyNodeProps(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /** Reads React's `useState` initial enabled map, once the inputs are bound. */
  ngOnInit(): void {
    for (const category of this.categories ?? [])
      this.enabled.set(category.id, category.required === true || !!category.defaultEnabled)
  }

  /**
   * Computes the banner's class list (React's `cm.cn(cm.stack(3), cm.sp('p', 4), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.cm().sp('p', 4), this.className)
  }

  /**
   * The banner's inline style text (React's fixed-position surface).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(BANNER_STYLE)
  }

  /**
   * The translated dialog label (React's `aria-label`).
   * @returns The label text.
   */
  ariaLabel(): string {
    return this.i18n.t('cookieBanner.title', {}, { defaultValue: 'Cookie preferences' })
  }

  /**
   * The title heading's class (`cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * A category row's class (`cm.flex({ align: 'center', justify: 'between', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * A category's text column class (`cm.cn(cm.flex1, cm.stack(0))`).
   * @returns The class string.
   */
  textColumnClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0))
  }

  /**
   * A category label's class (`cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * A category row's label id, which its switch is named by
   * (React's `${nameId()}-${index}`).
   * @param index - The category's index in the list.
   * @returns The id.
   */
  labelId(index: number): string {
    return `${this.nameBase}-${index}`
  }

  /**
   * A category row's description id, which its switch is described by
   * (React's `${nameId()}-${index}-description`).
   * @param index - The category's index in the list.
   * @returns The id.
   */
  descriptionId(index: number): string {
    return `${this.nameBase}-${index}-description`
  }

  /**
   * The footer's class (`cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The title input's text (React's `{slot(title) ?? t('cookieBanner.title')}`): the
   * input for strings and numbers, the i18n default when it renders nothing (`''`
   * included), and nothing while node content is projected.
   * @returns The text to render.
   */
  titleText(): string {
    if (this.hasTitleSlot()) return ''
    const value = this.title
    if (!rendersNode(value)) return this.ariaLabel()
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return ''
  }

  /**
   * The description input's text (React's `{slot(description) ?? t('cookieBanner.description')}`):
   * the i18n default when it renders nothing (`''` included).
   * @returns The text to render.
   */
  descriptionText(): string {
    if (this.hasDescriptionSlot()) return ''
    const value = this.description
    if (!rendersNode(value))
      return this.i18n.t(
        'cookieBanner.description',
        {},
        { defaultValue: 'We use cookies to improve your experience and analyse traffic.' },
      )
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return ''
  }

  /**
   * The policy link's label (React's `t('cookieBanner.learnMore')`).
   * @returns The label text.
   */
  learnMoreText(): string {
    return this.i18n.t('cookieBanner.learnMore', {}, { defaultValue: 'Learn more' })
  }

  /**
   * The Customize/Hide-details button's label.
   * @returns The label text.
   */
  detailsLabel(): string {
    return this.showDetails
      ? this.i18n.t('cookieBanner.hideDetails', {}, { defaultValue: 'Hide details' })
      : this.i18n.t('cookieBanner.customize', {}, { defaultValue: 'Customize' })
  }

  /**
   * The Reject button's label.
   * @returns The label text.
   */
  rejectText(): string {
    return this.i18n.t('cookieBanner.reject', {}, { defaultValue: 'Reject all' })
  }

  /**
   * The Save button's label.
   * @returns The label text.
   */
  saveText(): string {
    return this.i18n.t('cookieBanner.save', {}, { defaultValue: 'Save preferences' })
  }

  /**
   * The Accept button's label.
   * @returns The label text.
   */
  acceptText(): string {
    return this.i18n.t('cookieBanner.accept', {}, { defaultValue: 'Accept all' })
  }

  /**
   * Whether React's `categories &&` branches render (a nullish list does not).
   * @returns True when categories were supplied.
   */
  hasCategories(): boolean {
    return this.categories !== null && this.categories !== undefined
  }

  /**
   * Whether React's `showDetails && categories && onSave` Save branch renders.
   * @returns True when the Save button renders.
   */
  saveVisible(): boolean {
    return this.showDetails && this.hasCategories() && !!this.onSave
  }

  /**
   * Whether a value is one of the cases' projected node templates.
   * @param value - The field value.
   * @returns True for a projected node template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * The value as a template (call under {@link CookieBanner.isTemplate}).
   * @param value - The field value.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * Whether a category's switch is on (React's `!!enabled[c.id] || !!c.required`).
   * @param category - The category.
   * @returns Whether the switch is checked.
   */
  isChecked(category: CookieCategory): boolean {
    return !!this.enabled.get(category.id) || category.required === true
  }

  /** Flips the details block, as React's `setShowDetails((x) => !x)` does. */
  toggleDetails(): void {
    this.showDetails = !this.showDetails
  }

  /**
   * Toggles one category, as React's `setEnabled` does.
   * @param category - The category whose switch changed.
   * @param event - The native change event the UI Switch re-emitted.
   */
  toggle(category: CookieCategory, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false
    this.enabled.set(category.id, checked)
  }

  /**
   * The enabled categories as React's plain `Record<string, boolean>`.
   * @returns The enabled map.
   */
  enabledMap(): Record<string, boolean> {
    const out: Record<string, boolean> = {}
    for (const [id, enabled] of this.enabled) out[id] = enabled
    return out
  }

  /** Calls `onRejectAll`, then `onDismiss`. */
  reject(): void {
    this.dismissAfter(this.onRejectAll)
  }

  /** Calls `onSave(enabled)`, then `onDismiss`. */
  save(): void {
    this.dismissAfter(() => this.onSave?.(this.enabledMap()))
  }

  /** Calls `onAcceptAll`, then `onDismiss`. */
  accept(): void {
    this.dismissAfter(this.onAcceptAll)
  }

  /**
   * Calls the optional callback then the shared onDismiss handler.
   * @param fn - The mode-specific callback.
   */
  private dismissAfter(fn?: () => void): void {
    fn?.()
    this.onDismiss?.()
  }

  /**
   * Applies React's node-prop DOM: whichever capture span React would render is
   * unwrapped into the element React renders the value in, and the other is
   * taken out of the view.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private applyNodeProps(hasContent: SlotReader): void {
    const title = hasContent(this.titleSlot?.nativeElement)
    const description = hasContent(this.descriptionSlot?.nativeElement)
    this.hasTitleSlot.set(title)
    this.hasDescriptionSlot.set(description)
    this.applyNodeProp(
      this.titleHeading?.nativeElement,
      this.titleFallback?.nativeElement,
      this.titleSlot?.nativeElement,
      title,
    )
    this.applyNodeProp(
      this.descriptionHeading?.nativeElement,
      this.descriptionFallback?.nativeElement,
      this.descriptionSlot?.nativeElement,
      description,
    )
  }

  /**
   * Renders a field's capture points the way React renders the value: the one
   * React would render is unwrapped into the parent element, so no wrapper
   * appears, and the other is taken out of the view.
   *
   * @param parent - The element React renders the value in.
   * @param fallback - The span holding the plain input's text.
   * @param slot - The span holding the projected node content.
   * @param hasSlotContent - Whether the consumer projected node content.
   */
  private applyNodeProp(
    parent: HTMLElement | undefined,
    fallback: HTMLElement | undefined,
    slot: HTMLElement | undefined,
    hasSlotContent: boolean,
  ): void {
    if (!parent || !fallback || !slot) return
    // React renders only the value: the capture point holding it is unwrapped
    // into the parent element, and the other capture point drops out.
    if (hasSlotContent) {
      placeContent(fallback, null)
      placeContent(slot, parent, slot)
    } else {
      placeContent(slot, null)
      placeContent(fallback, parent, fallback)
    }
    setElementPresent(fallback, false)
    setElementPresent(slot, false)
  }
}
