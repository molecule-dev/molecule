/**
 * AuthGuard component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  Renderer2,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { RoutedView, useAuth, useRouter, useTranslation } from '@molecule/app-angular'

import { asTemplate, isGiven, nodeText } from '../utilities/node-value.js'
import { hasNodes, SlotWrapper } from './button.component.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * Props for {@link AuthGuard} (React's `AuthGuardProps`, in Angular's form).
 *
 * The fallback UI is a `string | number | TemplateRef<unknown>` input or a
 * projected `[slot=loadingFallback]`; the authenticated children are projected
 * content, so they have no member.
 */
export interface AuthGuardProps {
  /** Element rendered while the auth status is `loading`. */
  loadingFallback?: string | number | TemplateRef<unknown>
  /** i18n key for the default loading-tag text (default `common.loading`). */
  loadingKey?: string
  /** Fallback text if the i18n key is missing (default `Loading...`). */
  loadingDefault?: string
  /** Path to redirect to when unauthenticated (default `/login`). */
  loginPath?: string
  /** Fired when `isAuthenticated` becomes true (also when true at mount). */
  onAuthenticated?: () => void
}

/**
 * The pathname part of a login path (`/login?next=x` → `/login`).
 *
 * @param loginPath - The guard's `loginPath`.
 * @returns Its pathname.
 */
const loginPathname = (loginPath: string): string => loginPath.split(/[?#]/)[0] || '/'

/**
 * Route-element guard for authenticated sections of a routing tree.
 *
 * While the auth status is `'loading'` it renders the `loadingFallback` input
 * (or its `[slot=loadingFallback]` projection, or the default
 * `data-mol-id="auth-guard-loading"` tag); while
 * `'unauthenticated'` off the login path it renders nothing and redirects to
 * `loginPath` (state `from` carries the attempted location); otherwise it
 * renders the projected children, or `<mol-routed-view />` without them (the
 * matched child route, through whichever routing bond the app wired; it throws
 * when the bond has none: project the page then). The host is unwrapped by the DOM normalizer
 * (`data-parity-unwrap`) and `display: contents` keeps it fragment-like —
 * React's root is a fragment. On the login path itself the guard renders its
 * children, so a guard wrapping the whole route tree does not redirect in a
 * loop.
 *
 * The projected children need one stable capture point, so they live in an
 * always-mounted wrapper the guard moves into (or out of) the host itself:
 * React renders them bare, never inside a wrapper element, and renders
 * nothing at all while redirecting.
 */
@Component({
  selector: 'mol-auth-guard',
  standalone: true,
  imports: [MolTemplateOutlet, RoutedView],
  inputs: ['loadingFallback', 'loadingKey', 'loadingDefault', 'loginPath', 'onAuthenticated'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<div data-mol-id="auth-guard-loading" #defaultLoading>{{ loadingText() }}</div>
    <span #dataFallback
      ><ng-container [molTemplateOutlet]="asTemplate(loadingFallback)"></ng-container
      >{{ nodeText(loadingFallback) }}</span
    >
    <span #fallbackWrap><ng-content select="[slot=loadingFallback]"></ng-content></span>
    <span #childrenWrap><ng-content></ng-content></span>
    @if (routed()) {
      <mol-routed-view />
    }`,
})
export class AuthGuard implements AfterViewInit {
  /**
   * Element rendered while the auth status is `loading` (a node value, or the
   * projected `[slot=loadingFallback]`). Overrides the default loading tag.
   */
  loadingFallback?: AuthGuardProps['loadingFallback']
  /**
   * i18n key for the default loading-tag text (default `common.loading`).
   * Ignored when a `loadingFallback` is given.
   */
  loadingKey?: AuthGuardProps['loadingKey']
  /** Fallback text if the i18n key is missing (default `Loading...`). */
  loadingDefault?: AuthGuardProps['loadingDefault']
  /** Path to redirect to when unauthenticated (default `/login`). */
  loginPath?: AuthGuardProps['loginPath']
  /** Fired when `isAuthenticated` becomes true (also when true at mount). */
  onAuthenticated?: AuthGuardProps['onAuthenticated']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText

  /** The default loading tag. */
  @ViewChild('defaultLoading') defaultLoading?: ElementRef<HTMLDivElement>
  /** The node-valued fallback (shown when the input is given). */
  @ViewChild('dataFallback') dataFallback?: ElementRef<HTMLSpanElement>
  /** The `loadingFallback` slot capture (always mounted). */
  @ViewChild('fallbackWrap') fallbackWrap?: ElementRef<HTMLSpanElement>
  /** The children capture; its nodes are moved bare into the host to render. */
  @ViewChild('childrenWrap') childrenWrap?: ElementRef<HTMLSpanElement>

  /** Auth state, read in the component's injection context. */
  readonly auth = useAuth()
  /** Router state and actions, read in the component's injection context. */
  readonly router = useRouter()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private readonly host = inject(ElementRef)
  private hasFallback = false
  /** Whether the guard was given children to project (known by view init). */
  private hasChildren = false
  /** Whether the view queries have resolved, so the children capture can be read. */
  private viewReady = false
  /**
   * Whether the routed view renders: the children branch with no projected children. A signal
   * the template reads, so the routed view is created only then (it throws without one).
   */
  readonly routed = signal(false)
  private lastAuthenticated = false
  /** The login path the guard navigated to for the current redirect state. */
  private redirectedTo: string | null = null
  /** The children nodes currently adopted into the host. */
  private adopted: Node[] = []

  /**
   * Runs the first reconciliation after the view init (slot detection) and
   * again whenever the auth status or the location changes — the effect
   * tracks both signals directly, so the guard re-evaluates even though no
   * template binding reads them.
   */
  private readonly guardEffect = effect(() => {
    this.auth.status()
    this.router.location()
    this.reconcile()
  })

  /**
   * Detects the `loadingFallback` slot and the children (view queries resolve
   * only by view init).
   */
  ngAfterViewInit(): void {
    this.hasFallback = hasNodes(this.fallbackWrap?.nativeElement)
    this.hasChildren = hasNodes(this.childrenWrap?.nativeElement)
    this.viewReady = true
    this.reconcile()
  }

  /**
   * Applies React's branch for the current auth status and location, fires
   * `onAuthenticated` on its rising edge, and redirects once per entry into
   * the redirect state.
   */
  private reconcile(): void {
    const status = this.auth.status()
    const authenticated = this.auth.isAuthenticated()
    if (this.onAuthenticated && authenticated && !this.lastAuthenticated) this.onAuthenticated()
    this.lastAuthenticated = authenticated

    const pathname = this.router.location().pathname
    const target = this.loginPath ?? '/login'
    const redirecting = status === 'unauthenticated' && pathname !== loginPathname(target)
    if (redirecting) {
      if (this.redirectedTo !== target) {
        this.redirectedTo = target
        this.router.navigate(target, {
          replace: true,
          state: { from: { ...this.router.location() } },
        })
      }
    } else {
      this.redirectedTo = null
    }

    const branch = status === 'loading' ? 'loading' : redirecting ? 'redirect' : 'children'
    this.renderBranch(branch)
  }

  /**
   * Shows exactly one branch's content, the way React's early returns do.
   *
   * @param branch - The branch to render.
   */
  private renderBranch(branch: 'loading' | 'redirect' | 'children'): void {
    const host = this.host.nativeElement as HTMLElement
    const wrap = this.childrenWrap?.nativeElement
    if (wrap) {
      if (branch === 'children') {
        while (wrap.firstChild) {
          const node = wrap.firstChild
          host.appendChild(node)
          this.adopted.push(node)
        }
      } else {
        for (const node of this.adopted) {
          if (node.parentElement === host) wrap.appendChild(node)
        }
        this.adopted = []
      }
      // The capture span itself never renders (React's children are bare).
      this.sync.sync(this.childrenWrap?.nativeElement, false)
    }
    this.routed.set(this.viewReady && branch === 'children' && !this.hasChildren)
    const loading = branch === 'loading'
    const hasNode = isGiven(this.loadingFallback)
    this.sync.sync(this.defaultLoading?.nativeElement, loading && !hasNode && !this.hasFallback)
    this.sync.sync(this.fallbackWrap?.nativeElement, loading && !hasNode && this.hasFallback)
    this.sync.sync(this.dataFallback?.nativeElement, loading && hasNode)
  }

  /**
   * The localized default loading text.
   * @returns The translated text.
   */
  loadingText(): string {
    return this.i18n.t(
      this.loadingKey ?? 'common.loading',
      {},
      {
        defaultValue: this.loadingDefault ?? 'Loading...',
      },
    )
  }
}
