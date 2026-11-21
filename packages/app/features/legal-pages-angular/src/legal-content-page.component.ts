/**
 * LegalContentPage component (React parity): the standalone Privacy / Terms
 * page rendering the bonded legal HTML the footer modal shows.
 *
 * @module
 */

import { Component, inject, type OnChanges, type SimpleChanges } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { escapeHtml } from './escape-html.js'
import type { LegalKind } from './types.js'

/** The bonded i18n key holding each document's HTML. */
const CONTENT_KEY: Record<LegalKind, string> = {
  privacy: 'content.privacyPolicy',
  terms: 'content.termsOfService',
}

/** The i18n key + default for each document's page title. */
const TITLE: Record<LegalKind, { key: string; def: string }> = {
  privacy: { key: 'footer.privacyPolicy', def: 'Privacy Policy' },
  terms: { key: 'footer.termsOfService', def: 'Terms of Service' },
}

/** The locale-module key each document's lazy loader receives. */
const MODULE: Record<LegalKind, 'privacyPolicy' | 'termsOfService'> = {
  privacy: 'privacyPolicy',
  terms: 'termsOfService',
}

/** Most cached trusted-HTML values kept at once (the two documents need two; the cap bounds misuse). */
const TRUSTED_CACHE_LIMIT = 8

/** React's inline style for the hero band, serialized the way React writes it. */
const HERO_STYLE =
  'background: linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%); border-bottom: 1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)'

/** React's inline style for the hero's glow. */
const GLOW_STYLE = 'background: color-mix(in srgb, var(--mol-color-primary) 22%, transparent)'

/**
 * LegalContentPage component.
 *
 * Standalone Privacy / Terms page that renders the SAME bonded legal HTML the
 * footer modal shows (`content.privacyPolicy` / `content.termsOfService`),
 * wrapped in the same shell `ContentPageShell` renders — the host IS React's
 * outer `<div>` (`div[mol-legal-content-page]`), and its template mirrors the
 * shell's markup so the header/footer chrome is projected straight into it.
 *
 * The legal HTML renders through a sanitizer-bypassed `[innerHTML]`: React uses
 * `dangerouslySetInnerHTML` on app-supplied catalog content, and sanitizing
 * here would strip markup and render a different DOM. The `appName`
 * interpolated into that HTML is HTML-escaped first, exactly as React does.
 */
@Component({
  selector: 'div[mol-legal-content-page]',
  standalone: true,
  inputs: ['kind', 'appName', 'loadContent', 'header', 'footer', 'eyebrowKey', 'eyebrowDefault'],
  host: { '[class]': 'classes()' },
  template: `<ng-content select="[slot=header]"></ng-content>
    <section
      [attr.data-mol-id]="'page-' + (kind ?? 'privacy')"
      [class]="heroClasses()"
      [style]="heroStyle"
    >
      <div aria-hidden="true" [class]="cm().cn(cm().legalPagesHeroGlow)" [style]="glowStyle"></div>
      <div [class]="heroContentClasses()">
        <p [class]="eyebrowClasses()">{{ eyebrowText() }}</p>
        <h1 [class]="titleClasses()">{{ titleText() }}</h1>
      </div>
    </section>
    <main [class]="mainClasses()">
      <div [class]="bodyClasses()">
        <div [class]="cardClasses()">
          <div [class]="cm().cn(cm().prose)" [innerHTML]="trustedHtml()"></div>
        </div>
      </div>
    </main>
    <ng-content select="[slot=footer]"></ng-content>`,
})
export class LegalContentPage implements OnChanges {
  /** Which legal document to render (defaults to  at read time). */
  kind?: LegalKind
  /** App name interpolated into the policy body (privacy uses `{{appName}}`). */
  appName?: string
  /** Lazy-loader for the legal HTML, called on mount and when `kind` changes. */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
  /** App-specific top navigation (projected `[slot=header]` content). */
  header?: unknown
  /** App-specific footer (projected `[slot=footer]` content). */
  footer?: unknown
  /** i18n key for the small uppercase eyebrow (defaults to `nav.legal` at read time). */
  eyebrowKey?: string
  /** Default eyebrow text (defaults to `Legal` at read time). */
  eyebrowDefault?: string

  /** React's inline hero style. */
  protected readonly heroStyle = HERO_STYLE
  /** React's inline glow style. */
  protected readonly glowStyle = GLOW_STYLE

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The DOM sanitizer whose bypass keeps the legal HTML byte-identical to React's. */
  private readonly sanitizer = inject(DomSanitizer)

  /** Trusted-HTML values by source string (a re-render of the same HTML reuses it). */
  private readonly trusted = new Map<string, SafeHtml>()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host's class list (`cm.flex({ direction: 'col' })`, `cm.minH('screen')`,
   * `cm.legalPagesShell`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.legalPagesShell)
  }

  /**
   * The hero band's class list.
   * @returns The class string.
   */
  heroClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.legalPagesHero, cm.sp('px', 6), cm.sp('py', 16))
  }

  /**
   * The hero's inner content wrapper class list.
   * @returns The class string.
   */
  heroContentClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.container({ size: 'md' }), cm.legalPagesHeroContent)
  }

  /**
   * The eyebrow paragraph's class list.
   * @returns The class string.
   */
  eyebrowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.sp('mb', 3), cm.legalPagesHeroEyebrow)
  }

  /**
   * The title's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), cm.legalPagesHeroTitle)
  }

  /**
   * The `<main>`'s class list.
   * @returns The class string.
   */
  mainClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 10))
  }

  /**
   * The body container's class list.
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().container({ size: 'md' }))
  }

  /**
   * The surface card's class list.
   * @returns The class string.
   */
  cardClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.surface, cm.sp('p', 8), cm.legalPagesContentCard)
  }

  /**
   * The eyebrow text (React's `t(eyebrowKey, {}, { defaultValue: eyebrowDefault })`).
   * @returns The translated eyebrow.
   */
  eyebrowText(): string {
    return this.i18n.t(
      this.eyebrowKey ?? 'nav.legal',
      {},
      {
        defaultValue: this.eyebrowDefault ?? 'Legal',
      },
    )
  }

  /**
   * The page title (the footer modal's label for the same document).
   * @returns The translated title.
   */
  titleText(): string {
    const title = TITLE[this.kind ?? 'privacy']
    return this.i18n.t(title.key, {}, { defaultValue: title.def })
  }

  /**
   * The legal body: the catalog HTML for `kind`, the app name escaped.
   * @returns The HTML string.
   */
  html(): string {
    const appName = this.appName
    return this.i18n.t(
      CONTENT_KEY[this.kind ?? 'privacy'],
      appName ? { appName: escapeHtml(appName) } : {},
      { defaultValue: '' },
    )
  }

  /**
   * Marks the legal HTML as safe for the `[innerHTML]` binding. This bypasses
   * Angular's sanitizer DELIBERATELY: the legal HTML is app-supplied catalog
   * content and React renders it with `dangerouslySetInnerHTML`; sanitizing
   * would strip markup and render a different DOM. Memoized by string so a
   * re-render carrying the same HTML does not re-parse it (React skips such an
   * update too).
   *
   * @returns The trusted value for `[innerHTML]`.
   */
  trustedHtml(): SafeHtml {
    const html = this.html()
    const hit = this.trusted.get(html)
    if (hit !== undefined) return hit
    if (this.trusted.size >= TRUSTED_CACHE_LIMIT) this.trusted.clear()
    const value = this.sanitizer.bypassSecurityTrustHtml(html)
    this.trusted.set(html, value)
    return value
  }

  /**
   * Runs the app's lazy loader (React's `useEffect` over `[loadContent, kind]`):
   * once when the inputs first exist and again whenever either changes.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    // React's dependency list is `[loadContent, kind]`: any other input change
    // must not re-run the loader.
    if (!changes['kind'] && !changes['loadContent']) return
    const load = this.loadContent
    Promise.resolve(load?.(MODULE[this.kind ?? 'privacy'])).then(
      () => undefined,
      // A loader failure is not this page's to report: React's effect ignores
      // it the same way, and the bonded content that did register renders.
      (_error) => undefined,
    )
  }
}
