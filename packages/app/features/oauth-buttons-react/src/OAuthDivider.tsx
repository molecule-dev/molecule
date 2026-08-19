import type { JSX } from 'react'

/**
 * `<OAuthDivider />` — the "or continue with" rule above an OAuth row.
 *
 * @module
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { OAuthDividerProps } from './types.js'

/**
 * Renders a horizontal rule with centered label text — the "or
 * continue with" divider shown between a login/signup form and the
 * OAuth button row.
 *
 * Split out as its own sub-component so the config-driven
 * `<OAuthButtons>` in `@molecule/app-auth-ui-react` can compose it
 * above `<OAuthButtons>` (the row) without re-implementing the markup.
 *
 * @param props - See `OAuthDividerProps`.
 */
export function OAuthDivider({
  labelKey = 'oauth.orContinueWith',
  labelDefault = 'or continue with',
  className,
}: OAuthDividerProps = {}): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }), className)}>
      <span className={cm.cn(cm.flex1, cm.separator())} />
      <span>{t(labelKey, {}, { defaultValue: labelDefault })}</span>
      <span className={cm.cn(cm.flex1, cm.separator())} />
    </div>
  )
}
