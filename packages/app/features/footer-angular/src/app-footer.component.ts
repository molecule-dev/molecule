/**
 * AppFooter component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, signal } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'

import {
  Link,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
  useVersion,
} from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Modal } from '@molecule/app-ui-angular'

import { escapeHtml } from './escape-html.js'
import type { AppFooterLoadContent } from './types.js'

/** Most cached trusted-HTML values kept at once (two modals need two; the cap bounds misuse). */
const TRUSTED_CACHE_LIMIT = 8

/**
 * Whether an href points at an external site (React's `isExternalHref`).
 *
 * @param href - The About link target.
 * @returns True when it starts with an `http`/`https` scheme.
 */
const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href)

/**
 * AppFooter component.
 *
 * App-shell footer — About link, Privacy/Terms modals, language picker,
 * version. React's root is a FRAGMENT (the `<footer>` plus up to three
 * modals portaled into `document.body`), so the host's content renders in front
 * of the host's place and the host itself leaves the page
 * (`placeContentBefore` + `setElementPresent`), matching React's sibling list.
 *
 * The Privacy/Terms modal bodies render whatever HTML the bonded i18n catalog
 * holds under `content.privacyPolicy` / `content.termsOfService` as RAW HTML —
 * React's `dangerouslySetInnerHTML` trust model (the catalog is app-supplied).
 * The `[innerHTML]` binding deliberately BYPASSES Angular's sanitizer
 * (`bypassSecurityTrustHtml`): sanitizing would strip markup and render a
 * different DOM than React. The `appName` interpolated into that HTML is
 * HTML-escaped first, exactly as React does.
 *
 * Until the app registers legal content the modals show the
 * `footer.legalNotConfigured` placeholder — never a silently-blank modal, and
 * never fabricated legal text.
 */
@Component({
  selector: 'mol-app-footer',
  standalone: true,
  imports: [Icon, Link, Modal],
  hostDirectives: [MolPlacement],
  inputs: [
    'appName',
    'aboutHref',
    'legalMode',
    'loadContent',
    'privacyTo',
    'termsTo',
    'className',
    'dataMolId',
  ],
  template: `<footer [class]="footerClasses()" [attr.data-mol-id]="dataMolId ?? null">
      @if (isExternalAbout()) {
        <a [href]="aboutHref" target="_blank" rel="noopener noreferrer" [class]="linkClasses()">
          {{ aboutLabel() }}
        </a>
      } @else {
        <a [molLink]="aboutHref" [class]="linkClasses()">
          {{ aboutLabel() }}
        </a>
      }
      @if (isModalMode()) {
        <button type="button" (click)="openPrivacy()" [class]="buttonClasses()">
          {{ privacyLabel() }}
        </button>
        <button type="button" (click)="openTerms()" [class]="buttonClasses()">
          {{ termsLabel() }}
        </button>
      } @else {
        <a [molLink]="privacyToValue()" [class]="buttonClasses()">
          {{ privacyLabel() }}
        </a>
        <a [molLink]="termsToValue()" [class]="buttonClasses()">
          {{ termsLabel() }}
        </a>
      }
      <button
        type="button"
        (click)="openLanguage()"
        [class]="buttonClasses()"
        [attr.aria-label]="languageLabel()"
      >
        <svg mol-icon-root [name]="globeIcon" [size]="14"></svg>
        {{ activeLocaleName() }}
      </button>
      <span [class]="linkClasses()">{{ versionText() }}</span>
    </footer>
    @if (isModalMode()) {
      <mol-modal
        [open]="privacyOpen()"
        [title]="privacyLabel()"
        [size]="'lg'"
        (close)="closePrivacy()"
      >
        @if (hasLegalHtml(privacyHtml())) {
          <div [class]="proseClasses()" [innerHTML]="legalTrusted(privacyHtml())"></div>
        } @else {
          <p [class]="proseClasses()">{{ legalNotConfigured() }}</p>
        }
      </mol-modal>
      <mol-modal [open]="termsOpen()" [title]="termsLabel()" [size]="'lg'" (close)="closeTerms()">
        @if (hasLegalHtml(termsHtml())) {
          <div [class]="proseClasses()" [innerHTML]="legalTrusted(termsHtml())"></div>
        } @else {
          <p [class]="proseClasses()">{{ legalNotConfigured() }}</p>
        }
      </mol-modal>
    }
    <mol-modal
      [open]="languageOpen()"
      [title]="languageLabel()"
      [size]="'lg'"
      (close)="closeLanguage()"
    >
      <div [class]="gridClasses()">
        @for (locale of sortedLocales(); track locale.code) {
          <button
            type="button"
            (click)="pickLocale(locale.code)"
            [class]="localeOptionClasses(locale.code)"
          >
            {{ locale.name }}
          </button>
        }
      </div>
    </mol-modal>`,
})
export class AppFooter {
  /** Display name interpolated into the "About {{appName}}" link. */
  appName = ''
  /** URL or path for the About link (external `http(s)://` opens a new tab). */
  aboutHref = ''
  /** How privacy/terms surfaces are presented (`'modal'` by default). */
  legalMode: 'modal' | 'route' = 'modal'
  /**
   * Optional preloader called immediately before the privacy/terms modals
   * open (an input carrying the function, as React's `loadContent` prop).
   */
  loadContent?: AppFooterLoadContent
  /** Path for the Privacy Policy route (defaults to `/privacy` at read time). */
  privacyTo?: string
  /** Path for the Terms of Service route (defaults to `/terms` at read time). */
  termsTo?: string
  /** Extra className on the outer `<footer>` (composed with `cm.footerBar`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The glyph before the current locale name. */
  readonly globeIcon: IconName = 'globe'

  /** Whether the privacy modal is open. */
  readonly privacyOpen = signal(false)

  /** Whether the terms modal is open. */
  readonly termsOpen = signal(false)

  /** Whether the language modal is open. */
  readonly languageOpen = signal(false)

  /**
   * i18n state: locale, locale list and the async setter. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  readonly i18n = useTranslation()

  /** Version state (the version core's web provider, like React's `useVersion`). */
  readonly version = useVersion()

  private readonly sanitizer = inject(DomSanitizer)

  /** Memoized trusted-HTML values, by raw HTML string (React skips a re-render whose `__html` is unchanged). */
  private readonly trustedCache = new Map<string, SafeHtml>()

  /** The component's host element (React renders a fragment, no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the fragment (the `<footer>` plus the portalled modals): it renders in
    // front of the host's place and the host leaves the page.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The footer's class list (`cm.footerBar` + `className`).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().cn(this.cm().footerBar, this.className)
  }

  /**
   * The About link's and version span's class (`cm.footerLink`), through
   * `cn()` so a token that is a function in the bonded map resolves to its
   * string.
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm().cn(this.cm().footerLink)
  }

  /**
   * The legal buttons'/route links'/language button's class (`cm.footerButton`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(this.cm().footerButton)
  }

  /**
   * The legal content's class (`cm.prose`).
   * @returns The class string.
   */
  proseClasses(): string {
    return this.cm().cn(this.cm().prose)
  }

  /**
   * The language grid's class (`cm.languageGrid`).
   * @returns The class string.
   */
  gridClasses(): string {
    return this.cm().cn(this.cm().languageGrid)
  }

  /**
   * One language option's class: `cm.languageActive` for the active locale,
   * `cm.languageOption` otherwise (React's ternary).
   *
   * @param code - The option's locale code.
   * @returns The class string.
   */
  localeOptionClasses(code: string): string {
    return this.cm().cn(
      code === this.currentLocale() ? this.cm().languageActive : this.cm().languageOption,
    )
  }

  /**
   * Whether privacy/terms render as in-place modals (React's `legalMode` default).
   * @returns False only when the input was bound to `'route'`.
   */
  isModalMode(): boolean {
    return this.legalMode !== 'route'
  }

  /**
   * Whether the About link opens a new tab (external `http(s)://` href).
   * @returns True when the href is external.
   */
  isExternalAbout(): boolean {
    return isExternalHref(this.aboutHref)
  }

  /**
   * The Privacy route path (React's default parameter).
   * @returns The path.
   */
  privacyToValue(): string {
    return this.privacyTo ?? '/privacy'
  }

  /**
   * The Terms route path (React's default parameter).
   * @returns The path.
   */
  termsToValue(): string {
    return this.termsTo ?? '/terms'
  }

  /**
   * The About link's label (`footer.about` with the app name).
   * @returns The label text.
   */
  aboutLabel(): string {
    return this.i18n.t(
      'footer.about',
      { appName: this.appName },
      { defaultValue: 'About {{appName}}' },
    )
  }

  /**
   * The Privacy Policy button/modal-title label.
   * @returns The label text.
   */
  privacyLabel(): string {
    return this.i18n.t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })
  }

  /**
   * The Terms of Service button/modal-title label.
   * @returns The label text.
   */
  termsLabel(): string {
    return this.i18n.t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })
  }

  /**
   * The language button's accessible label (also the language modal's title).
   * @returns The label text.
   */
  languageLabel(): string {
    return this.i18n.t('footer.language', {}, { defaultValue: 'Language' })
  }

  /**
   * The version span's text (`footer.version` with the version state, or
   * `'1.0.0'` before the app set one).
   * @returns The version text.
   */
  versionText(): string {
    return this.i18n.t(
      'footer.version',
      { version: this.version.state().version || '1.0.0' },
      { defaultValue: 'v{{version}}' },
    )
  }

  /**
   * The honest placeholder shown while no legal content is registered.
   * @returns The placeholder text.
   */
  legalNotConfigured(): string {
    return this.i18n.t(
      'footer.legalNotConfigured',
      {},
      {
        defaultValue: 'This content has not been configured yet. The app owner must provide it.',
      },
    )
  }

  /**
   * The Privacy modal's legal HTML from the bonded i18n catalog, with the
   * app name HTML-escaped before interpolation (a markup-carrying app name
   * must arrive as inert entities).
   * @returns The raw HTML string (empty until the app registers content).
   */
  privacyHtml(): string {
    return this.i18n.t(
      'content.privacyPolicy',
      { appName: escapeHtml(this.appName) },
      { defaultValue: '' },
    )
  }

  /**
   * The Terms modal's legal HTML from the bonded i18n catalog, with the
   * app name HTML-escaped before interpolation.
   * @returns The raw HTML string (empty until the app registers content).
   */
  termsHtml(): string {
    return this.i18n.t(
      'content.termsOfService',
      { appName: escapeHtml(this.appName) },
      { defaultValue: '' },
    )
  }

  /**
   * Whether a legal HTML string carries content (React's `html.trim()` check):
   * when it does not, the modal renders the placeholder paragraph instead of
   * a blank injected-HTML div.
   *
   * @param html - The raw HTML string from the catalog.
   * @returns True when it has non-whitespace content.
   */
  hasLegalHtml(html: string): boolean {
    return html.trim().length > 0
  }

  /**
   * Marks legal HTML as safe for the `[innerHTML]` binding. This bypasses
   * Angular's sanitizer DELIBERATELY: the legal HTML is app-supplied catalog
   * content, and React renders it with `dangerouslySetInnerHTML` — sanitizing
   * here would strip markup and render a different DOM than React. The value
   * is memoized by string so a re-render that carries the same HTML does not
   * re-parse and recreate the modal's nodes (React skips such an update too).
   *
   * @param html - The raw HTML string from the catalog.
   * @returns The trusted value for `[innerHTML]`.
   */
  legalTrusted(html: string): SafeHtml {
    const hit = this.trustedCache.get(html)
    if (hit !== undefined) return hit
    // Bound the cache: distinct legal strings per page are a handful; a churn
    // above the limit is dropped wholesale rather than leaking.
    if (this.trustedCache.size >= TRUSTED_CACHE_LIMIT) this.trustedCache.clear()
    const trusted = this.sanitizer.bypassSecurityTrustHtml(html)
    this.trustedCache.set(html, trusted)
    return trusted
  }

  /**
   * The active locale's display name (React's `locales.find(...)?.name`).
   * @returns The name, or null when the locale is not registered.
   */
  activeLocaleName(): string | null {
    return this.i18n.locales().find((locale) => locale.code === this.currentLocale())?.name ?? null
  }

  /**
   * The registered locales, sorted by native name (React sorts in render).
   * @returns The sorted locales.
   */
  sortedLocales(): { code: string; name: string }[] {
    return [...this.i18n.locales()].sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * The active locale code.
   * @returns The locale code.
   */
  currentLocale(): string {
    return this.i18n.locale()
  }

  /** Opens the Privacy modal, lazy-loading the catalog body first (React's `openPrivacy`). */
  async openPrivacy(): Promise<void> {
    if (this.loadContent) await this.loadContent('privacyPolicy')
    this.privacyOpen.set(true)
  }

  /** Opens the Terms modal, lazy-loading the catalog body first (React's `openTerms`). */
  async openTerms(): Promise<void> {
    if (this.loadContent) await this.loadContent('termsOfService')
    this.termsOpen.set(true)
  }

  /** Opens the language modal. */
  openLanguage(): void {
    this.languageOpen.set(true)
  }

  /** Closes the Privacy modal (React's `onClose`). */
  closePrivacy(): void {
    this.privacyOpen.set(false)
  }

  /** Closes the Terms modal (React's `onClose`). */
  closeTerms(): void {
    this.termsOpen.set(false)
  }

  /** Closes the language modal (React's `onClose`). */
  closeLanguage(): void {
    this.languageOpen.set(false)
  }

  /**
   * Switches the locale, then closes the language modal (React's option
   * click). A failed switch surfaces to the caller and leaves the modal open,
   * exactly like React's async handler.
   *
   * @param code - The locale code to switch to.
   */
  async pickLocale(code: string): Promise<void> {
    await this.i18n.setLocale(code)
    this.languageOpen.set(false)
  }
}
