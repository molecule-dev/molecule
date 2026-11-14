import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  type OnDestroy,
  Output,
  runInInjectionContext,
  signal,
} from '@angular/core'

import { useOAuth, type UseOAuthConfig } from '@molecule/app-angular'
import { OAuthButtons as OAuthButtonRow, OAuthDivider } from '@molecule/app-oauth-buttons-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

/**
 * Config-driven OAuth provider button row rendered beneath a
 * login/signup form.
 *
 * The host IS the wrapper `<div>` (`div[mol-auth-oauth-buttons]`),
 * matching React's root. React renders `null` when the config yields no
 * providers, so the host is detached from the DOM in that state (the
 * same pattern `@molecule/app-ui-angular`'s `Toast` uses) and restored
 * before Angular removes it.
 *
 * @module
 */

/**
 * Config-driven OAuth provider button row rendered beneath a
 * login/signup form.
 *
 * This is the convenience layer over the primitives in
 * `@molecule/app-oauth-buttons-angular`: it reads `providers` +
 * `redirect` from `useOAuth(oauthConfig)`, then composes `OAuthDivider`
 * (the "or continue with" rule) above `OAuthButtons` (the button row).
 * Apps with an `oauthConfig` object use this; apps that already hold a
 * raw provider list use the lower-level row directly.
 *
 * The component also owns the CALLBACK half of the page-based flow:
 * `useOAuth` detects `?code&state` on the page this row is mounted on,
 * exchanges the code, and reports the outcome here — a failed exchange
 * (forged/expired code, state mismatch, provider rejection) renders a
 * VISIBLE inline error (`data-mol-id="oauth-error"`, `role="alert"`)
 * instead of failing silently, and a success fires the `success` output
 * so the host can navigate into the app.
 */
@Component({
  selector: 'div[mol-auth-oauth-buttons]',
  standalone: true,
  imports: [OAuthButtonRow, OAuthDivider],
  inputs: [
    'oauthConfig',
    'className',
    'iconSize',
    'iconMode',
    'showLabels',
    'dividerKey',
    'dividerDefault',
  ],
  host: {
    '[class]': 'className',
  },
  template: `<div mol-oauth-divider [labelKey]="dividerKey" [labelDefault]="dividerDefault"></div>
    @if (errorMessage(); as message) {
      <div [class]="cm().authFormError" role="alert" data-mol-id="oauth-error">{{ message }}</div>
    }
    <div
      mol-oauth-buttons
      [providers]="oauthProviders()"
      [onSelect]="rowOnSelect"
      [iconSize]="iconSize"
      [iconMode]="iconMode"
      [showLabels]="showLabels"
      (success)="handleRowSuccess()"
    ></div>`,
})
export class OAuthButtons implements OnDestroy {
  /** The current `oauthConfig` input, as a signal the hook follows. */
  private readonly config = signal<UseOAuthConfig | undefined>(undefined)

  /**
   * The app's OAuth config, passed to the binding's `useOAuth()`. A changed
   * config reaches the hook on this mount (React re-renders the row with it).
   * @param value - The config.
   */
  set oauthConfig(value: UseOAuthConfig | undefined) {
    this.config.set(value)
  }

  /**
   * The app's OAuth config.
   * @returns The current config.
   */
  get oauthConfig(): UseOAuthConfig | undefined {
    return this.config()
  }
  /** Extra class applied to the outer wrapper. */
  className?: string
  /** Icon size in pixels (default 30). */
  iconSize?: number
  /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /** When true, render the provider label text next to the logo. */
  showLabels?: boolean
  /** Override the default "or continue with" divider text's i18n key. */
  dividerKey?: string
  /** Override the default "or continue with" divider text. */
  dividerDefault?: string
  /**
   * Called after a successful OAuth login (the session is already
   * established) — e.g. `() => navigate('/dashboard')`.
   */
  @Output() readonly success = new EventEmitter<void>()
  /**
   * Called when the OAuth callback exchange fails. The (already visible)
   * inline error message is passed through for hosts that also want to
   * surface it elsewhere.
   */
  @Output() readonly error = new EventEmitter<string>()

  /** The visible exchange failure, when the callback exchange failed. */
  private readonly errorMessage = signal<string | null>(null)

  /** The element ref of the host (the wrapper div). */
  private readonly el = inject(ElementRef)
  private detachedParent: Node | null = null
  private detachedAnchor: Node | null = null

  /**
   * This component's own injector, captured in the injection context so the
   * `useOAuth` call below can run in it once the inputs exist (an Angular
   * component reads its inputs after construction, unlike React's
   * per-render hook call). It must be the component's injector, not the
   * environment's: the hook's `DestroyRef` then ends with this component, so
   * an exchange that settles after unmount calls neither output.
   */
  private readonly injector = inject(Injector)

  /** The `useOAuth` result: providers, redirect and the callback flow. */
  private oauth?: ReturnType<typeof useOAuth>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The provider list from `useOAuth(oauthConfig)`.
   * @returns The provider ids.
   */
  oauthProviders(): string[] {
    return this.oauth?.providers ?? []
  }

  /**
   * Leaves the page for the provider (React passes the hook's `redirect`
   * directly; a stable wrapper keeps the row's input identity).
   * @param provider - The provider id.
   */
  readonly rowOnSelect = (provider: string): void => {
    this.oauth?.redirect(provider)
  }

  /**
   * React's wrapped row success: clear any visible error, then report
   * success to the host.
   */
  handleRowSuccess(): void {
    this.errorMessage.set(null)
    this.success.emit()
  }

  /**
   * Starts the OAuth hook once the inputs exist. `useOAuth` needs an
   * injection context, which `ngOnInit` is not, so the captured component
   * injector provides one; the auth client it reads resolves up to the
   * app-level one (`provideAuth`), exactly what React's hook reads from
   * its provider.
   */
  ngOnInit(): void {
    this.oauth = runInInjectionContext(this.injector, () =>
      useOAuth(
        computed(() => ({
          ...this.config(),
          onSuccess: () => {
            this.errorMessage.set(null)
            this.success.emit()
          },
          onError: (message: string) => {
            // The message is the api's (localized) error body or the hook's
            // fallback — render it so a failed callback is never invisible.
            this.errorMessage.set(message)
            this.error.emit(message)
          },
        })),
      ),
    )
  }

  /**
   * Removes the host element from the DOM while React would render null
   * (no providers), and restores it when providers appear.
   */
  syncHostVisibility(): void {
    const host = this.el.nativeElement as HTMLElement
    if (this.oauthProviders().length === 0) {
      if (host.isConnected) {
        this.detachedParent = host.parentNode
        this.detachedAnchor = host.nextSibling
        host.parentNode?.removeChild(host)
      }
    } else if (this.detachedParent && !host.isConnected) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /**
   * Reconciles host visibility once the view is in the document: the first
   * ngDoCheck of a cycle runs before Angular has inserted a freshly created
   * view, so the mount-time decision (React renders null for no providers)
   * is applied here, where the host is connected and can be detached.
   */
  ngAfterViewInit(): void {
    this.syncHostVisibility()
  }

  /** Re-reconciles host visibility after input writes and resets. */
  ngDoCheck(): void {
    this.syncHostVisibility()
  }

  /** Restores the host before Angular removes it (unmount). */
  ngOnDestroy(): void {
    const host = this.el.nativeElement as HTMLElement
    // The host must be inside its parent for Angular's own removal to succeed.
    if (!host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }
}
