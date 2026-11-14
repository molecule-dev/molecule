import { type Component, createMemo, For, Show } from 'solid-js'

/**
 * `<OAuthButtons />` — config-driven OAuth provider button row.
 *
 * @module
 */
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-solid'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { getBrandStyle } from './brand-styles.js'
import { dedupeProviders, getProviderLabel } from './labels.js'
import { getButtonLayoutStyle, getLayoutStyle } from './layout.js'
import type { OAuthButtonsProps } from './types.js'

/**
 * Renders one styled button per OAuth provider.
 *
 * Composes the canonical brand logos from
 * `@molecule/app-oauth-logos-solid` and pulls layout / chrome from
 * the wired ClassMap (`cm.oauthButtonGroup`, `cm.oauthButton`,
 * `cm.oauthButtonIcon`). When `brandButtons` is set, each button also
 * gets its provider's exact brand-spec background via inline `style`
 * (ClassMap intentionally does not encode provider brand colors).
 *
 * This is the lower-level primitive — host apps that have an
 * `oauthConfig` object typically use the config-driven
 * `<OAuthButtons>` from `@molecule/app-auth-ui-solid`, which composes
 * this row plus `<OAuthDivider>`.
 *
 * @param props - See `OAuthButtonsProps`.
 *
 * @example
 * ```tsx
 * import { OAuthButtons } from '@molecule/app-oauth-buttons-solid'
 * import { useOAuth } from '@molecule/app-solid'
 * import { oauthConfig } from '../config'
 *
 * function LoginPage() {
 *   const { providers, redirect } = useOAuth(oauthConfig)
 *   return (
 *     <OAuthButtons
 *       providers={providers}
 *       onSelect={redirect}
 *       layout="grid"
 *       showLabels
 *     />
 *   )
 * }
 * ```
 */
export const OAuthButtons: Component<OAuthButtonsProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const ordered = createMemo(() => dedupeProviders(props.providers))

  /**
   * Activate a provider button: start the flow via `onSelect`, and — for an
   * inline handler that resolves the handshake in place (popup/PKCE, e.g. an
   * auth bond's `signInWithProvider`) — fire `onSuccess(provider)` on
   * completion. A full-page `redirect` onSelect returns `void`, so there is
   * nothing to await and `onSuccess` correctly never fires (that flow's
   * completion is observed on the callback page by `useOAuth(config).onSuccess`
   * instead). A rejected handshake also does not fire `onSuccess`.
   */
  const activate = (provider: string): void => {
    const onSelect = props.onSelect
    if (!onSelect) return
    const result = onSelect(provider)
    if (result instanceof Promise) {
      void result.then(
        () => props.onSuccess?.(provider),
        (_error) => {
          // The handshake failed/aborted — `onSuccess` must NOT fire. Surfacing
          // the error is the initiating `onSelect` handler's responsibility
          // (e.g. `useOAuth`'s `onError`); this presentational row only reports
          // success. Swallowing here is the documented, correct noop.
        },
      )
    }
  }

  return (
    <Show when={ordered().length > 0}>
      <div
        class={cm.cn(cm.oauthButtonGroup, props.className)}
        role="group"
        aria-label={t('oauthButtons.groupLabel', undefined, {
          defaultValue: 'Continue with another account',
        })}
        style={getLayoutStyle(props.layout ?? 'horizontal', ordered().length)}
        data-mol-id="oauth-buttons"
        data-layout={props.layout ?? 'horizontal'}
      >
        <For each={ordered()}>
          {(provider) => {
            const label = getProviderLabel(provider)
            const localizedName = (): string =>
              t(label.key, undefined, { defaultValue: label.default })
            return (
              <button
                type="button"
                onClick={props.onSelect ? () => activate(provider) : undefined}
                aria-label={t(
                  'oauthButtons.continueWith',
                  { provider: localizedName() },
                  {
                    defaultValue: 'Continue with {{provider}}',
                  },
                )}
                class={cm.oauthButton}
                data-mol-id={`oauth-button-${provider}`}
                data-provider={provider}
                style={{
                  ...(props.brandButtons ? getBrandStyle(provider) : {}),
                  ...getButtonLayoutStyle(props.layout ?? 'horizontal'),
                }}
              >
                <span class={cm.oauthButtonIcon}>
                  <OAuthProviderLogo
                    provider={provider}
                    size={props.iconSize ?? 30}
                    mode={props.iconMode ?? 'brand'}
                    ariaLabel=""
                  />
                </span>
                <Show when={props.showLabels}>
                  <span class={cm.oauthProviderLabel}>{localizedName()}</span>
                </Show>
              </button>
            )
          }}
        </For>
      </div>
    </Show>
  )
}
