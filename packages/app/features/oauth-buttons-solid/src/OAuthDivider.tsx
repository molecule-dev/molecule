/**
 * `<OAuthDivider />` — the "or continue with" rule above an OAuth row.
 *
 * @module
 */
import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { OAuthDividerProps } from './types.js'

/**
 * Renders a horizontal rule with centered label text — the "or
 * continue with" divider shown between a login/signup form and the
 * OAuth button row.
 *
 * Split out as its own sub-component so the config-driven
 * `<OAuthButtons>` in `@molecule/app-auth-ui-solid` can compose it
 * above `<OAuthButtons>` (the row) without re-implementing the markup.
 *
 * @param props - See `OAuthDividerProps`.
 */
export const OAuthDivider: Component<OAuthDividerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div class={cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }), props.className)}>
      <span class={cm.cn(cm.flex1, cm.separator())} />
      <span>
        {t(
          props.labelKey ?? 'oauth.orContinueWith',
          {},
          {
            defaultValue: props.labelDefault ?? 'or continue with',
          },
        )}
      </span>
      <span class={cm.cn(cm.flex1, cm.separator())} />
    </div>
  )
}
