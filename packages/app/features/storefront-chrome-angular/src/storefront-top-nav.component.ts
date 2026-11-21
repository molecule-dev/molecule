/**
 * StorefrontTopNav component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  Component,
  type ElementRef,
  type OnDestroy,
  type OnInit,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { Link, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasRenderableContent, hasText, isNodeTemplate, nodeText } from './internal.js'
import type { NavActionSpec, NavLinkSpec, ProfileMenuItem } from './types.js'

/**
 * Storefront top navigation bar.
 *
 * Brand link + horizontal nav links + the icon-action cluster (search, cart
 * with a badge, the profile dropdown). The host IS the `<header>`
 * (`header[mol-storefront-top-nav]`), matching React's root exactly, and
 * carries React's `data-mol-id="nav-shell-01"`. Node props (`brand`) are
 * projected content (`[slot=brand]`) or plain text inputs; node-valued fields
 * inside the data props (`links[].label`, `menu[].label`) arrive as
 * `ng-template` references and render through `NgTemplateOutlet`. Same props
 * and same DOM as `@molecule/app-storefront-chrome-react`'s
 * `StorefrontTopNav`.
 */
@Component({
  selector: 'header[mol-storefront-top-nav]',
  standalone: true,
  imports: [Link, NgTemplateOutlet],
  inputs: [
    'brand',
    'brandTo',
    'links',
    'actions',
    'isAuthenticated',
    'profileImageUrl',
    'profileInitials',
    'profileImageAlt',
    'accountMenuLabel',
    'authedMenu',
    'unauthedMenu',
    'onSignOut',
    'signOutLabel',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'hostDomId',
  },
  // prettier-ignore
  template: `<nav [class]="navClasses()" data-mol-id="nav-layout-01">
    <div [class]="brandContainerClasses()" data-mol-id="brand-container-01"><a [molLink]="brandToValue()" [class]="brandClasses()" data-mol-id="brand-logo-01">@if (brandTemplate(); as brandTpl) {<ng-container [ngTemplateOutlet]="brandTpl"></ng-container>}@if (hasTextBrand()) {<ng-container>{{ brand }}</ng-container>}<span data-parity-unwrap><ng-content select="[slot=brand]"></ng-content></span></a></div>
    @if (links && links.length > 0) {<ul [class]="linksClasses()" data-mol-id="nav-links-list-01">@for (link of links; track link.to) {<li><a [molLink]="link.to" [class]="linkClasses(link)" [attr.data-mol-id]="link.dataMolId ?? null">@if (isTemplate(link.label)) {<ng-container [ngTemplateOutlet]="asTemplate(link.label)"></ng-container>}@if (hasText(link.label)) {<ng-container>{{ linkText(link) }}</ng-container>}</a></li>}</ul>}
    <div [class]="actionsClasses()" data-mol-id="nav-actions-01">@for (action of actions; track action.to) {<a [molLink]="action.to" [class]="actionClasses()" [attr.data-mol-id]="action.dataMolId ?? null" [attr.aria-label]="action.ariaLabel"><span [class]="iconClasses()" [attr.data-icon]="action.icon">{{ action.icon }}</span>@if (action.badgeCount && action.badgeCount > 0) {<span [class]="badgeClasses()">{{ action.badgeCount }}</span>}</a>}<div [class]="wrapperClasses()" #profileWrapper data-mol-id="profile-wrapper-01"><button type="button" [attr.aria-label]="accountMenuLabelValue()" aria-haspopup="menu" [attr.aria-expanded]="isOpen() ? 'true' : 'false'" [class]="triggerClasses()" style="overflow: hidden" data-mol-id="profile-trigger-01" (click)="toggle()">@if (profileImageUrl) {<img [attr.alt]="profileImageAltValue()" [class]="imageClasses()" [attr.src]="profileImageUrl" />} @else if (profileInitials) {<span [class]="initialsClasses()">{{ profileInitials }}</span>} @else {<span [class]="personClasses()" data-icon="person" aria-hidden="true">person</span>}</button>@if (isOpen()) {<div [class]="menuClasses()" data-mol-id="profile-dropdown-01">@for (item of menuItems(); track item.to) {<a [molLink]="item.to" [class]="menuItemClasses()" [attr.data-mol-id]="item.dataMolId ?? null" (click)="closeMenu()">@if (isTemplate(item.label)) {<ng-container [ngTemplateOutlet]="asTemplate(item.label)"></ng-container>}@if (hasText(item.label)) {<ng-container>{{ itemText(item) }}</ng-container>}</a>}@if (isAuthenticated && onSignOut) {<hr [class]="dividerClasses()" /><button type="button" [class]="signOutClasses()" data-mol-id="profile-link-signout" (click)="signOut()">@if (isTemplate(signOutLabel)) {<ng-container [ngTemplateOutlet]="asTemplate(signOutLabel)"></ng-container>}@if (showSignOutText()) {<ng-container>{{ signOutLabelText() }}</ng-container>}<span #signOutSlot data-parity-unwrap><ng-content select="[slot=signOutLabel]"></ng-content></span></button>}</div>}</div></div>
  </nav>`,
})
export class StorefrontTopNav implements OnInit, OnDestroy, AfterViewChecked {
  /** The brand mark — a text input, or `[slot=brand]` projected content. */
  brand?: unknown
  /** Path the brand link navigates to (defaults to `/` at read time). */
  brandTo?: string
  /** Horizontal nav links. */
  links?: NavLinkSpec[]
  /** Icon-button actions (search, cart, …). */
  actions?: NavActionSpec[]
  /** Whether the visitor is signed in — picks the dropdown menu. */
  isAuthenticated = false
  /** Avatar image URL (optional enhancement). */
  profileImageUrl?: string
  /** Initials shown when there is no image. */
  profileInitials?: string
  /** Avatar alt text (React's `profileImageAlt` default, translated through `t()`). */
  profileImageAlt?: string
  /** Accessible name for the account-menu trigger (React's default, translated through `t()`). */
  accountMenuLabel?: string
  /** Menu items shown when signed in. */
  authedMenu?: ProfileMenuItem[]
  /** Menu items shown when signed out. */
  unauthedMenu?: ProfileMenuItem[]
  /** Called when the sign-out row is clicked. */
  onSignOut?: () => void
  /** Sign-out button label — text, a template, or `[slot=signOutLabel]` content. */
  signOutLabel?: unknown
  /** Extra classes on the header. */
  className?: string

  /** React's root `data-mol-id`. */
  readonly hostDomId = 'nav-shell-01'

  /** The profile wrapper the outside-mousedown check tests against. */
  @ViewChild('profileWrapper') private profileWrapper?: ElementRef<HTMLDivElement>

  /** The sign-out label's capture point (projected content lands here). */
  @ViewChild('signOutSlot') private signOutSlot?: ElementRef<HTMLSpanElement>

  /** Whether `[slot=signOutLabel]` projection landed (React renders it instead of the text). */
  private readonly signOutProjected = signal(false)

  /** Whether the profile dropdown is open. */
  private readonly open = signal(false)

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Attaches the document mousedown listener React adds while the menu is open
   * (the handler itself returns early while it is closed).
   */
  ngOnInit(): void {
    document.addEventListener('mousedown', this.onDoc)
  }

  /**
   * Removes the document listener.
   */
  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.onDoc)
  }

  /**
   * Tracks whether the sign-out row's label arrived as projected content, so
   * the text fallback renders only when it did not (React renders exactly one
   * of the two).
   */
  ngAfterViewChecked(): void {
    const slot = this.signOutSlot?.nativeElement
    const filled = slot ? hasRenderableContent(slot) : false
    if (filled !== this.signOutProjected()) this.signOutProjected.set(filled)
  }

  /**
   * Closes the menu when a mousedown occurs outside the profile wrapper (React's
   * outside-click effect, which only exists while the menu is open).
   * @param event - The document mousedown.
   */
  private readonly onDoc = (event: MouseEvent): void => {
    if (!this.open()) return
    const wrapper: Node | undefined = this.profileWrapper?.nativeElement
    const target = event.target as Node | null
    if (wrapper && target && wrapper.contains(target)) return
    this.open.set(false)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the dropdown menu is open.
   * @returns The open state.
   */
  isOpen(): boolean {
    return this.open()
  }

  /**
   * Toggles the dropdown menu (React's trigger `onClick`).
   */
  toggle(): void {
    this.open.update((value) => !value)
  }

  /**
   * Closes the dropdown menu (React's menu-item `onClick`).
   */
  closeMenu(): void {
    this.open.set(false)
  }

  /**
   * The dropdown's items for the current auth state.
   * @returns The menu items.
   */
  menuItems(): ProfileMenuItem[] {
    return (this.isAuthenticated ? this.authedMenu : this.unauthedMenu) ?? []
  }

  /**
   * React's sign-out handler: close the menu, then call `onSignOut`.
   */
  signOut(): void {
    this.open.set(false)
    this.onSignOut?.()
  }

  /**
   * The header's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().storefrontChromeTopNav, this.className)
  }

  /**
   * The nav's class list.
   * @returns The class string.
   */
  navClasses(): string {
    return this.cm().cn(
      this.cm().flex({ justify: 'between', align: 'center' }),
      this.cm().sp('px', 6),
      this.cm().h(16),
      this.cm().mxAuto,
      this.cm().w('full'),
      this.cm().storefrontChromeTopNavInner,
    )
  }

  /**
   * The brand container's class list.
   * @returns The class string.
   */
  brandContainerClasses(): string {
    return this.cm().flex({ align: 'center' })
  }

  /**
   * The brand link's class list.
   * @returns The class string.
   */
  brandClasses(): string {
    return this.cm().cn(
      this.cm().textSize('2xl'),
      this.cm().textPrimary,
      this.cm().storefrontChromeTopNavBrand,
    )
  }

  /**
   * The nav links list's class list.
   * @returns The class string.
   */
  linksClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center' }), this.cm().storefrontChromeTopNavLinks)
  }

  /**
   * One nav link's class list.
   * @param link - The link spec.
   * @returns The class string.
   */
  linkClasses(link: NavLinkSpec): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      this.cm().fontWeight('medium'),
      link.active
        ? this.cm().cn(
            this.cm().textPrimary,
            this.cm().sp('pb', 1),
            this.cm().storefrontChromeTopNavLinkActive,
          )
        : this.cm().storefrontChromeTopNavLink,
    )
  }

  /**
   * The action cluster's class list.
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 4 })
  }

  /**
   * One icon action's class list.
   * @returns The class string.
   */
  actionClasses(): string {
    return this.cm().cn(this.cm().storefrontChromeTopNavAction)
  }

  /**
   * The action glyph's class list.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().iconGlyphFont
  }

  /**
   * The badge's class list.
   * @returns The class string.
   */
  badgeClasses(): string {
    return this.cm().cn(
      this.cm().roundedFull,
      this.cm().fontWeight('bold'),
      this.cm().storefrontChromeTopNavBadge,
    )
  }

  /**
   * The profile wrapper's class list.
   * @returns The class string.
   */
  wrapperClasses(): string {
    return this.cm().cn(this.cm().position('relative'))
  }

  /**
   * The trigger button's class list.
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().w(8),
      this.cm().h(8),
      this.cm().roundedFull,
      this.cm().cursorPointer,
      this.cm().touchTarget,
      this.cm().borderAll,
      this.cm().flex({ align: 'center', justify: 'center' }),
    )
  }

  /**
   * The avatar image's class list.
   * @returns The class string.
   */
  imageClasses(): string {
    return this.cm().cn(this.cm().w('full'), this.cm().h('full'), this.cm().objectCover)
  }

  /**
   * The initials span's class list.
   * @returns The class string.
   */
  initialsClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('bold'),
      this.cm().textPrimary,
    )
  }

  /**
   * The default avatar glyph's class list.
   * @returns The class string.
   */
  personClasses(): string {
    return this.cm().cn(this.cm().iconGlyphFont, this.cm().textMuted)
  }

  /**
   * The dropdown panel's class list.
   * @returns The class string.
   */
  menuClasses(): string {
    return this.cm().cn(
      this.cm().sp('mt', 2),
      this.cm().sp('py', 1),
      this.cm().w(48),
      this.cm().storefrontChromeTopNavMenu,
    )
  }

  /**
   * One dropdown item's class list.
   * @returns The class string.
   */
  menuItemClasses(): string {
    return this.cm().cn(
      this.cm().sp('px', 4),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      this.cm().storefrontChromeTopNavMenuItem,
    )
  }

  /**
   * The menu divider's class list.
   * @returns The class string.
   */
  dividerClasses(): string {
    return this.cm().cn(this.cm().sp('my', 1), this.cm().storefrontChromeTopNavMenuDivider)
  }

  /**
   * The sign-out row's class list.
   * @returns The class string.
   */
  signOutClasses(): string {
    return this.cm().cn(
      this.cm().dropdownItem,
      this.cm().w('full'),
      this.cm().textSize('sm'),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The brand path (React's `brandTo = '/'` default).
   * @returns The path.
   */
  brandToValue(): string {
    return this.brandTo ?? '/'
  }

  /**
   * The avatar alt text (React's `profileImageAlt` default, translated through
   * `t()`).
   * @returns The alt text.
   */
  profileImageAltValue(): string {
    return (
      this.profileImageAlt ??
      this.i18n.t('storefrontChrome.nav.userProfile', undefined, { defaultValue: 'User profile' })
    )
  }

  /**
   * The trigger's accessible name (React's `accountMenuLabel` default,
   * translated through `t()`).
   * @returns The label.
   */
  accountMenuLabelValue(): string {
    return (
      this.accountMenuLabel ??
      this.i18n.t('storefrontChrome.nav.accountMenu', undefined, {
        defaultValue: 'Account menu',
      })
    )
  }

  /**
   * Whether the sign-out label renders as text: no projected label, and the
   * effective label is text (React renders a string or the `'Sign Out'` default).
   * @returns True when the text label shows.
   */
  showSignOutText(): boolean {
    return !this.signOutProjected() && hasText(this.signOutLabelValue())
  }

  /**
   * The sign-out label's effective value (React's `signOutLabel` default,
   * translated through `t()`).
   * @returns The label value.
   */
  signOutLabelValue(): unknown {
    return this.signOutLabel === undefined
      ? this.i18n.t('storefrontChrome.nav.signOut', undefined, { defaultValue: 'Sign Out' })
      : this.signOutLabel
  }

  /**
   * The sign-out label's text (React's `signOutLabel` default, translated
   * through `t()`).
   * @returns The text.
   */
  signOutLabelText(): string {
    return nodeText(this.signOutLabelValue())
  }

  /**
   * The brand mark as a template, when the caller passed a node as the input.
   * @returns The template, or null for text or projected content.
   */
  brandTemplate(): TemplateRef<unknown> | null {
    return isNodeTemplate(this.brand) ? this.brand : null
  }

  /**
   * Whether the brand renders as a text input (a projected brand is not).
   * @returns True when the brand interpolates as text.
   */
  hasTextBrand(): boolean {
    return hasText(this.brand)
  }

  /**
   * The text of a nav link's label.
   * @param link - The link spec.
   * @returns The text.
   */
  linkText(link: NavLinkSpec): string {
    return nodeText(link.label)
  }

  /**
   * The text of a menu item's label.
   * @param item - The menu item.
   * @returns The text.
   */
  itemText(item: ProfileMenuItem): string {
    return nodeText(item.label)
  }

  /**
   * Whether a value renders as text.
   * @param value - The field value.
   * @returns True when the value interpolates as text.
   */
  hasText(value: unknown): boolean {
    return hasText(value)
  }

  /**
   * Whether the value is a node template.
   * @param value - The prop value.
   * @returns True for a template ref.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isNodeTemplate(value)
  }

  /**
   * The value as a template ref (checked by {@link StorefrontTopNav.isTemplate} first).
   * @param value - The prop value.
   * @returns The template ref.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }
}
