/**
 * ContentPageShell component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type Renderer2,
  RendererFactory2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'

/** React's inline style for the hero band, serialized the way React writes it. */
const HERO_STYLE =
  'background: linear-gradient(135deg, color-mix(in srgb, var(--mol-color-primary) 14%, var(--mol-color-background)) 0%, var(--mol-color-background) 70%); border-bottom: 1px solid color-mix(in srgb, var(--mol-color-on-surface) 8%, transparent)'

/** React's inline style for the hero's glow. */
const GLOW_STYLE = 'background: color-mix(in srgb, var(--mol-color-primary) 22%, transparent)'

/**
 * ContentPageShell component.
 *
 * Branded shell for public content pages (Privacy, Terms, Pricing,
 * PlanUpdated, …). The host IS the outer `<div>` (`div[mol-content-page-shell]`),
 * matching React's root exactly. The app's own chrome is projected content
 * (`[slot=header]`, `[slot=footer]`); the hero's eyebrow, title and subtitle are
 * `[slot=eyebrow]`, `[slot=title]` and `[slot=subtitle]`; the body is the
 * default projection.
 *
 * React renders the hero only when a title is supplied, the eyebrow and
 * subtitle paragraphs only when their nodes are, and the body's surface card
 * only when `bare` is false — Angular's projection points must exist, so
 * {@link ContentPageShell.ngDoCheck} reconciles all four against React's DOM.
 */
@Component({
  selector: 'div[mol-content-page-shell]',
  standalone: true,
  inputs: [
    'dataMolId',
    'eyebrow',
    'title',
    'subtitle',
    'header',
    'footer',
    'bare',
    'containerSize',
  ],
  host: { '[class]': 'classes()' },
  // prettier-ignore
  template: `<ng-content select="[slot=header]"></ng-content><section #heroEl [attr.data-mol-id]="dataMolId ?? null" [class]="heroClasses()" [style]="heroStyle"><div aria-hidden="true" [class]="cm().cn(cm().legalPagesHeroGlow)" [style]="glowStyle"></div><div [class]="heroContentClasses()"><p #eyebrowEl [class]="eyebrowClasses()"><ng-content select="[slot=eyebrow]"></ng-content></p><h1 #titleEl [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h1><p #subtitleEl [class]="subtitleClasses()"><ng-content select="[slot=subtitle]"></ng-content></p></div></section><main [class]="mainClasses()"><div #bodyEl [class]="bodyClasses()"><div #cardEl [class]="cardClasses()"><ng-content></ng-content></div></div></main><ng-content select="[slot=footer]"></ng-content>`,
})
export class ContentPageShell implements AfterViewInit, DoCheck {
  /** `data-mol-id` applied to the hero band for AI-agent selectors. */
  dataMolId?: string
  /** Small uppercase label above the title (projected `[slot=eyebrow]` content). */
  eyebrow?: unknown
  /** Page title (projected `[slot=title]` content); without it the hero does not render. */
  title?: unknown
  /** Optional supporting line under the title (projected `[slot=subtitle]` content). */
  subtitle?: unknown
  /** App-specific top navigation (projected `[slot=header]` content). */
  header?: unknown
  /** App-specific footer (projected `[slot=footer]` content). */
  footer?: unknown
  /** When true, the body renders without the surface card wrapper. */
  bare = false
  /** Container width (`'md'` when unset). */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'

  /** React's inline hero style. */
  protected readonly heroStyle = HERO_STYLE
  /** React's inline glow style. */
  protected readonly glowStyle = GLOW_STYLE

  /** The hero band (React renders none without a title). */
  @ViewChild('heroEl') private heroEl?: ElementRef<HTMLElement>
  /** The title heading — its projected nodes decide whether the hero renders. */
  @ViewChild('titleEl') private titleEl?: ElementRef<HTMLElement>
  /** The eyebrow paragraph (React renders none without an eyebrow). */
  @ViewChild('eyebrowEl') private eyebrowEl?: ElementRef<HTMLElement>
  /** The subtitle paragraph (React renders none without a subtitle). */
  @ViewChild('subtitleEl') private subtitleEl?: ElementRef<HTMLElement>
  /** The body container (the card's parent). */
  @ViewChild('bodyEl') private bodyEl?: ElementRef<HTMLElement>
  /** The surface card around the body (unwrapped when `bare`). */
  @ViewChild('cardEl') private cardEl?: ElementRef<HTMLElement>

  private readonly host = inject(ElementRef<HTMLElement>)
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null)
  private readonly guard = new SlotGuard(this.host, this.renderer)

  /** The body nodes moved out of the card when `bare` unwrapped it. */
  private bareMoved: Node[] = []

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
    return cm.cn(cm.container({ size: this.size() }), cm.legalPagesHeroContent)
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
   * The subtitle paragraph's class list.
   * @returns The class string.
   */
  subtitleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('base'), cm.sp('mt', 3), cm.legalPagesHeroSubtitle)
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
    return this.cm().cn(this.cm().container({ size: this.size() }))
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
   * The container size (React's default parameter).
   * @returns The container size.
   */
  size(): 'sm' | 'md' | 'lg' | 'xl' {
    return this.containerSize ?? 'md'
  }

  /**
   * Reconciles the conditional wrappers with React's DOM (the view queries
   * resolve only at view init, so the first pass is here).
   */
  ngAfterViewInit(): void {
    this.sync()
  }

  /** Reconciles after input writes and projected-content changes. */
  ngDoCheck(): void {
    this.sync()
  }

  /**
   * Detaches the wrappers React would not render, at their own position so a
   * later pass can restore them.
   */
  private sync(): void {
    this.guard.toggle(this.heroEl?.nativeElement, hasNodes(this.titleEl?.nativeElement))
    this.guard.toggle(this.eyebrowEl?.nativeElement, hasNodes(this.eyebrowEl?.nativeElement))
    this.guard.toggle(this.subtitleEl?.nativeElement, hasNodes(this.subtitleEl?.nativeElement))
    this.syncBare()
  }

  /**
   * Applies React's `bare ? children : <div class="…surface…">{children}</div>`:
   * the card exists for its `<ng-content>` capture point, so `bare` unwraps it
   * by moving the projected nodes into the body container, and a later
   * non-bare pass puts them back.
   */
  private syncBare(): void {
    const card = this.cardEl?.nativeElement
    const body = this.bodyEl?.nativeElement
    if (!card || !body) return
    if (this.bare) {
      if (!card.isConnected) return
      const nodes = Array.from(card.childNodes).filter(
        (node) =>
          node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim() !== ''),
      )
      for (const node of nodes) body.insertBefore(node, card)
      this.bareMoved = nodes
      card.remove()
      return
    }
    if (card.isConnected) return
    body.appendChild(card)
    for (const node of this.bareMoved) card.appendChild(node)
    this.bareMoved = []
  }
}
