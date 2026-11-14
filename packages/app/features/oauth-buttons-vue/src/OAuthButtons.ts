/**
 * `<OAuthButtons />` — config-driven OAuth provider button row.
 *
 * @module
 */
import { defineComponent, h, type PropType, type VNode } from 'vue'

import { OAuthProviderLogo } from '@molecule/app-oauth-logos-vue'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { getBrandStyle } from './brand-styles.js'
import { dedupeProviders, getProviderLabel } from './labels.js'
import { getButtonLayoutStyle, getLayoutStyle } from './layout.js'

/**
 * Renders one styled button per OAuth provider.
 *
 * Composes the canonical brand logos from
 * `@molecule/app-oauth-logos-vue` and pulls layout / chrome from
 * the wired ClassMap (`cm.oauthButtonGroup`, `cm.oauthButton`,
 * `cm.oauthButtonIcon`). When `brandButtons` is set, each button also
 * gets its provider's exact brand-spec background via inline `style`
 * (ClassMap intentionally does not encode provider brand colors).
 *
 * This is the lower-level primitive — host apps that have an
 * `oauthConfig` object typically use the config-driven
 * `<OAuthButtons>` from `@molecule/app-auth-ui-vue`, which composes
 * this row plus `<OAuthDivider>`.
 *
 * Vue counterpart of `@molecule/app-oauth-buttons-react`'s
 * `OAuthButtons`, with the same props and the same DOM. The two
 * callback props are Vue listeners: declare handlers for the
 * `select` and `success` emits (`@select="…"`, `@success="…"`).
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { OAuthButtons } from '@molecule/app-oauth-buttons-vue'
 * import { useOAuth } from '@molecule/app-vue'
 * import { oauthConfig } from '../config'
 *
 * export const LoginPage = defineComponent({
 *   setup() {
 *     const { providers, redirect } = useOAuth(oauthConfig)
 *     return () =>
 *       h(OAuthButtons, {
 *         providers: providers.value,
 *         onSelect: redirect,
 *         layout: 'grid',
 *         showLabels: true,
 *       })
 *   },
 * })
 * ```
 */
export const OAuthButtons = defineComponent({
  name: 'OAuthButtons',
  props: {
    providers: { type: Array as PropType<string[]>, default: () => [] },
    layout: { type: String as PropType<'horizontal' | 'vertical' | 'grid'>, default: 'horizontal' },
    iconSize: { type: Number, default: 30 },
    iconMode: { type: String as PropType<'brand' | 'mono'>, default: 'brand' },
    brandButtons: { type: Boolean, default: false },
    showLabels: { type: Boolean, default: false },
    className: String,
    // The two callback props: `@select` / `@success` (or `:on-select` /
    // `:on-success`) bind these, exactly as the conformance contract
    // describes. They are declared as props — not resolved through `emit` —
    // because Vue's `emit` discards the handler's return value, which the
    // inline-flow promise branch below needs.
    onSelect: Function as PropType<(provider: string) => void | Promise<unknown>>,
    onSuccess: Function as PropType<(provider: string) => void>,
  },
  emits: {
    /** The user activated a provider button: the flow starts via this handler. */
    select: (provider: string) => typeof provider === 'string',
    /** An inline `select` handler resolved — the OAuth handshake completed. */
    success: (provider: string) => typeof provider === 'string',
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * Activate a provider button: start the flow via the `select` listener,
     * and — for an inline handler that resolves the handshake in place
     * (popup/PKCE, e.g. an auth bond's `signInWithProvider`) — fire the
     * `success` listener on completion. A full-page `redirect` handler
     * returns `void`, so there is nothing to await and `success` correctly
     * never fires (that flow's completion is observed on the callback page
     * by `useOAuth(config).onSuccess` instead). A rejected handshake also
     * does not fire `success`.
     */
    const activate = (provider: string): void => {
      const handler = props.onSelect
      if (!handler) return
      const result = handler(provider)
      if (result instanceof Promise) {
        void result.then(
          () => props.onSuccess?.(provider),
          (_error) => {
            // The handshake failed/aborted — `success` must NOT fire. Surfacing
            // the error is the initiating `onSelect` handler's responsibility
            // (e.g. `useOAuth`'s `onError`); this presentational row only reports
            // success. Swallowing here is the documented, correct noop.
          },
        )
      }
    }

    return (): VNode | null => {
      const ordered = dedupeProviders(props.providers)
      if (ordered.length === 0) return null

      const wrapperStyle = getLayoutStyle(props.layout, ordered.length)
      const buttonStyle = getButtonLayoutStyle(props.layout)

      return h(
        'div',
        {
          class: cm.cn(cm.oauthButtonGroup, props.className),
          role: 'group',
          'aria-label': t('oauthButtons.groupLabel', undefined, {
            defaultValue: 'Continue with another account',
          }),
          style: wrapperStyle,
          'data-mol-id': 'oauth-buttons',
          'data-layout': props.layout,
        },
        ordered.map((provider) => {
          const label = getProviderLabel(provider)
          const localizedName = t(label.key, undefined, { defaultValue: label.default })
          const brandStyle = props.brandButtons ? getBrandStyle(provider) : {}
          const ariaLabel = t(
            'oauthButtons.continueWith',
            { provider: localizedName },
            { defaultValue: 'Continue with {{provider}}' },
          )
          return h(
            'button',
            {
              key: provider,
              type: 'button',
              onClick: props.onSelect ? () => activate(provider) : undefined,
              'aria-label': ariaLabel,
              class: cm.oauthButton,
              'data-mol-id': `oauth-button-${provider}`,
              'data-provider': provider,
              style: { ...brandStyle, ...buttonStyle },
            },
            [
              h('span', { class: cm.oauthButtonIcon }, [
                h(OAuthProviderLogo, {
                  provider,
                  size: props.iconSize,
                  mode: props.iconMode,
                  ariaLabel: '',
                }),
              ]),
              props.showLabels ? h('span', { class: cm.oauthProviderLabel }, localizedName) : null,
            ],
          )
        }),
      )
    }
  },
})
