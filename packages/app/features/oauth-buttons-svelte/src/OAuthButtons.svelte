<!--
  OAuthButtons: the Svelte counterpart of `@molecule/app-oauth-buttons-react`'s
  `OAuthButtons` — one styled button per OAuth provider. Composes the canonical
  brand logos from `@molecule/app-oauth-logos-svelte` and pulls layout / chrome
  from the wired ClassMap (`cm.oauthButtonGroup`, `cm.oauthButton`,
  `cm.oauthButtonIcon`). When `brandButtons` is set, each button also gets its
  provider's exact brand-spec background via the inline `style` attribute
  (ClassMap intentionally does not encode provider brand colors).
-->
<script lang="ts">
  import { OAuthProviderLogo } from '@molecule/app-oauth-logos-svelte'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { getBrandStyle } from './brand-styles.js'
  import { dedupeProviders, getProviderLabel } from './labels.js'
  import { getButtonLayoutStyle, getLayoutStyle } from './layout.js'
  import type { OAuthButtonsProps } from './types.js'

  let {
    providers,
    onSelect,
    onSuccess,
    layout = 'horizontal',
    iconSize = 30,
    iconMode = 'brand',
    brandButtons = false,
    showLabels = false,
    className,
  }: OAuthButtonsProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const ordered = $derived(dedupeProviders(providers))

  const wrapperStyle = $derived(getLayoutStyle(layout, ordered.length))
  const buttonStyle = $derived(getButtonLayoutStyle(layout))

  /**
   * Joins the per-button style overlays into one `style` attribute value, the
   * way React spreads `{ ...brandStyle, ...buttonStyle }`: brand first, layout
   * second; empty parts contribute nothing.
   *
   * @param brandStyle - The provider's brand declarations ('' when unset).
   * @param layoutStyle - The layout's button declarations ('' when unset).
   * @returns The joined CSS declarations.
   */
  function buttonStyleAttr(brandStyle: string, layoutStyle: string): string {
    return [brandStyle, layoutStyle].filter(Boolean).join('; ')
  }

  /**
   * Activate a provider button: start the flow via `onSelect`, and — for an
   * inline handler that resolves the handshake in place (popup/PKCE, e.g. an
   * auth bond's `signInWithProvider`) — fire `onSuccess(provider)` on
   * completion. A full-page `redirect` onSelect returns `void`, so there is
   * nothing to await and `onSuccess` correctly never fires (that flow's
   * completion is observed on the callback page by `useOAuth(config).onSuccess`
   * instead). A rejected handshake also does not fire `onSuccess`.
   *
   * @param provider - The activated provider id.
   */
  function activate(provider: string): void {
    if (!onSelect) return
    const result = onSelect(provider)
    if (result instanceof Promise) {
      void result.then(
        () => onSuccess?.(provider),
        (_error) => {
          // The handshake failed/aborted — `onSuccess` must NOT fire. Surfacing
          // the error is the initiating `onSelect` handler's responsibility
          // (e.g. `useOAuth`'s `onError`); this presentational row only reports
          // success. Swallowing here is the documented, correct noop.
        },
      )
    }
  }
</script>

{#if ordered.length > 0}
  <div
    class={cm.cn(cm.oauthButtonGroup, className)}
    role="group"
    aria-label={t('oauthButtons.groupLabel', undefined, {
      defaultValue: 'Continue with another account',
    })}
    style={wrapperStyle}
    data-mol-id="oauth-buttons"
    data-layout={layout}
  >
    {#each ordered as provider (provider)}
      {@const label = getProviderLabel(provider)}
      {@const localizedName = t(label.key, label.values, { defaultValue: label.default })}
      {@const brandStyle = brandButtons ? getBrandStyle(provider) : ''}
      <button
        type="button"
        onclick={onSelect ? () => activate(provider) : undefined}
        aria-label={t(
          'oauthButtons.continueWith',
          { provider: localizedName },
          { defaultValue: 'Continue with {{provider}}' },
        )}
        class={cm.oauthButton}
        data-mol-id={`oauth-button-${provider}`}
        data-provider={provider}
        style={buttonStyleAttr(brandStyle, buttonStyle)}
      >
        <span class={cm.oauthButtonIcon}>
          <OAuthProviderLogo {provider} size={iconSize} mode={iconMode} ariaLabel="" />
        </span>
        {#if showLabels}<span class={cm.oauthProviderLabel}>{localizedName}</span>{/if}
      </button>
    {/each}
  </div>
{/if}
