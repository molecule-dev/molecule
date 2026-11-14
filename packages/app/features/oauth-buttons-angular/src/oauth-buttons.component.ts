import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  type OnDestroy,
  Output,
  Renderer2,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { getBrandStyle } from './brand-styles.js'
import { dedupeProviders, getProviderLabel } from './labels.js'
import { getButtonLayoutStyle, getLayoutStyle } from './layout.js'
import type { OAuthButtonsLayout } from './types.js'

/**
 * `OAuthButtons` — config-driven OAuth provider button row.
 *
 * The host IS the button-group `<div>` (`div[mol-oauth-buttons]`),
 * matching React's root. React renders `null` when the de-duplicated
 * provider list is empty, so the host is detached from the DOM in that
 * state (the same pattern `@molecule/app-ui-angular`'s `Toast` uses) and
 * restored before Angular removes it.
 *
 * @module
 */

/**
 * Renders one styled button per OAuth provider.
 *
 * Composes the canonical brand logos from
 * `@molecule/app-oauth-logos-angular` and pulls layout / chrome from
 * the wired ClassMap (`cm.oauthButtonGroup`, `cm.oauthButton`,
 * `cm.oauthButtonIcon`). When `brandButtons` is set, each button also
 * gets its provider's exact brand-spec background via inline `style`
 * (ClassMap intentionally does not encode provider brand colors).
 *
 * This is the lower-level primitive — host apps that have an
 * `oauthConfig` object typically use the config-driven `OAuthButtons`
 * from `@molecule/app-auth-ui-angular`, which composes this row plus
 * `OAuthDivider`.
 */
@Component({
  selector: 'div[mol-oauth-buttons]',
  standalone: true,
  imports: [OAuthProviderLogo],
  inputs: [
    'providers',
    'onSelect',
    'layout',
    'iconSize',
    'iconMode',
    'brandButtons',
    'showLabels',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    role: 'group',
    '[attr.aria-label]': 'groupLabel()',
    '[style]': 'wrapperStyleText()',
    'data-mol-id': 'oauth-buttons',
    '[attr.data-layout]': 'layoutVariant()',
  },
  template: `@for (provider of ordered(); track provider) {
    <button
      type="button"
      (click)="activate(provider)"
      [attr.aria-label]="buttonLabel(provider)"
      [class]="cm().oauthButton"
      [attr.data-mol-id]="'oauth-button-' + provider"
      [attr.data-provider]="provider"
      [style]="buttonStyleText(provider)"
    >
      <span [class]="cm().oauthButtonIcon"
        ><mol-oauth-provider-logo
          [provider]="provider"
          [size]="logoSize()"
          [mode]="logoMode()"
          [ariaLabel]="''"
      /></span>
      @if (showLabels) {
        <span [class]="cm().oauthProviderLabel">{{ providerText(provider) }}</span>
      }
    </button>
  }`,
})
export class OAuthButtons implements OnDestroy {
  /**
   * Ordered list of provider ids to render (see `OAuthButtonsProps.providers`).
   */
  providers: string[] = []
  /**
   * Optional click handler, called with the provider id when the user
   * activates a button (React's `onSelect` — the component inspects the
   * returned promise, so it is a plain input).
   */
  onSelect?: (provider: string) => void | Promise<unknown>
  /**
   * Called with the provider id when an inline `onSelect` promise
   * resolves (React's `onSuccess`).
   */
  @Output() readonly success = new EventEmitter<string>()
  /** Layout variant (default `'horizontal'`). */
  layout?: OAuthButtonsLayout
  /** Icon size in pixels (default 30). */
  iconSize?: number
  /** Logo color mode — `'brand'` (default) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /** Paint buttons with their provider's brand-spec colors. */
  brandButtons?: boolean
  /** Render the localized provider label next to the logo. */
  showLabels?: boolean
  /** Extra class composed onto the button-group element. */
  className?: string

  /** The element ref of the host (the button-group div). */
  private readonly el = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private detachedParent: Node | null = null
  private detachedAnchor: Node | null = null

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The button-group class list (React's
   * `cm.cn(cm.oauthButtonGroup, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().oauthButtonGroup, this.className)
  }

  /**
   * The de-duplicated provider list, preserving the caller's order
   * (React's `dedupeProviders(providers)`).
   * @returns The ordered provider ids.
   */
  ordered(): string[] {
    return dedupeProviders(this.providers ?? [])
  }

  /**
   * The layout variant (React's `layout` default `'horizontal'`, applied
   * when the input was never set or was bound `undefined`).
   * @returns The layout.
   */
  layoutVariant(): OAuthButtonsLayout {
    return this.layout ?? 'horizontal'
  }

  /**
   * The logo size (React's `iconSize` default 30).
   * @returns The pixel size.
   */
  logoSize(): number {
    return this.iconSize ?? 30
  }

  /**
   * The logo color mode (React's `iconMode` default `'brand'`).
   * @returns The mode.
   */
  logoMode(): 'brand' | 'mono' {
    return this.iconMode ?? 'brand'
  }

  /**
   * The wrapper's inline style text (React's
   * `style={getLayoutStyle(layout, ordered.length)}`); null when empty, so no
   * `style` attribute renders.
   * @returns The style text or null.
   */
  wrapperStyleText(): string | null {
    return styleText(getLayoutStyle(this.layoutVariant(), this.ordered().length))
  }

  /**
   * One button's inline style text (React's
   * `style={{ ...brandStyle, ...buttonStyle }}`); null when empty.
   * @param provider - The provider the button activates.
   * @returns The style text or null.
   */
  buttonStyleText(provider: string): string | null {
    const brand = this.brandButtons ? getBrandStyle(provider) : {}
    return styleText({ ...brand, ...getButtonLayoutStyle(this.layoutVariant()) })
  }

  /**
   * The localized provider name (React's `t(label.key, undefined,
   * { defaultValue: label.default })`).
   * @param provider - The provider id.
   * @returns The localized name.
   */
  providerText(provider: string): string {
    const label = getProviderLabel(provider)
    return this.i18n.t(label.key, undefined, { defaultValue: label.default })
  }

  /**
   * A button's accessible label (React's
   * `t('oauthButtons.continueWith', { provider }, { defaultValue:
   * 'Continue with {{provider}}' })`).
   * @param provider - The provider id.
   * @returns The label text.
   */
  buttonLabel(provider: string): string {
    return this.i18n.t(
      'oauthButtons.continueWith',
      { provider: this.providerText(provider) },
      { defaultValue: 'Continue with {{provider}}' },
    )
  }

  /**
   * The group's accessible label (React's
   * `t('oauthButtons.groupLabel', undefined, { defaultValue: 'Continue
   * with another account' })`).
   * @returns The label text.
   */
  groupLabel(): string {
    return this.i18n.t('oauthButtons.groupLabel', undefined, {
      defaultValue: 'Continue with another account',
    })
  }

  /**
   * Activate a provider button: start the flow via `onSelect`, and — for an
   * inline handler that resolves the handshake in place (popup/PKCE, e.g. an
   * auth bond's `signInWithProvider`) — fire the `success` output with the
   * provider on completion. A full-page `redirect` onSelect returns `void`, so
   * there is nothing to await and `success` correctly never fires (that flow's
   * completion is observed on the callback page by `useOAuth(config).onSuccess`
   * instead). A rejected handshake also does not fire it.
   * @param provider - The provider id.
   */
  activate(provider: string): void {
    const select = this.onSelect
    if (!select) return
    const result = select(provider)
    if (result instanceof Promise) {
      void result.then(
        () => this.success.emit(provider),
        (_error) => {
          // The handshake failed/aborted — `success` must NOT fire. Surfacing
          // the error is the initiating `onSelect` handler's responsibility
          // (e.g. `useOAuth`'s `onError`); this presentational row only reports
          // success. Swallowing here is the documented, correct noop.
        },
      )
    }
  }

  /**
   * Removes the host element from the DOM while React would render null
   * (no providers), and restores it when providers appear.
   */
  syncHostVisibility(): void {
    const host = this.el.nativeElement as HTMLElement
    if (this.ordered().length === 0) {
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
