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
  ViewChild,
} from '@angular/core'

import { useAuth, useRouter } from '@molecule/app-angular'
import { t } from '@molecule/app-i18n'

import { hasNodes, SlotWrapper } from './button.component.js'

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
 * While the auth status is `'loading'` it renders the `loadingFallback` slot
 * (or the default `data-mol-id="auth-guard-loading"` tag); while
 * `'unauthenticated'` off the login path it renders nothing and redirects to
 * `loginPath` (state `from` carries the attempted location); otherwise it
 * renders the projected children. The host is unwrapped by the DOM normalizer
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
  inputs: ['loadingKey', 'loadingDefault', 'loginPath', 'onAuthenticated'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<div data-mol-id="auth-guard-loading" #defaultLoading>{{ loadingText() }}</div>
    <span #fallbackWrap><ng-content select="[slot=loadingFallback]"></ng-content></span>
    <span #childrenWrap><ng-content></ng-content></span>`,
})
export class AuthGuard implements AfterViewInit {
  /**
   * i18n key for the default loading-tag text (default `common.loading`).
   * Ignored when a `loadingFallback` slot is projected.
   */
  loadingKey?: string
  /** Fallback text if the i18n key is missing (default `Loading...`). */
  loadingDefault?: string
  /** Path to redirect to when unauthenticated (default `/login`). */
  loginPath?: string
  /** Fired when `isAuthenticated` becomes true (also when true at mount). */
  onAuthenticated?: () => void

  /** The default loading tag. */
  @ViewChild('defaultLoading') defaultLoading?: ElementRef<HTMLDivElement>
  /** The `loadingFallback` slot capture (always mounted). */
  @ViewChild('fallbackWrap') fallbackWrap?: ElementRef<HTMLSpanElement>
  /** The children capture; its nodes are moved bare into the host to render. */
  @ViewChild('childrenWrap') childrenWrap?: ElementRef<HTMLSpanElement>

  /** Auth state, read in the component's injection context. */
  readonly auth = useAuth()
  /** Router state and actions, read in the component's injection context. */
  readonly router = useRouter()

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private readonly host = inject(ElementRef)
  private hasFallback = false
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
   * Detects the `loadingFallback` slot presence (view queries resolve only by
   * view init).
   */
  ngAfterViewInit(): void {
    this.hasFallback = hasNodes(this.fallbackWrap?.nativeElement)
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
    this.sync.sync(this.defaultLoading?.nativeElement, branch === 'loading' && !this.hasFallback)
    this.sync.sync(this.fallbackWrap?.nativeElement, branch === 'loading' && this.hasFallback)
  }

  /**
   * The localized default loading text.
   * @returns The translated text.
   */
  loadingText(): string {
    return t(
      this.loadingKey ?? 'common.loading',
      {},
      {
        defaultValue: this.loadingDefault ?? 'Loading...',
      },
    )
  }
}
