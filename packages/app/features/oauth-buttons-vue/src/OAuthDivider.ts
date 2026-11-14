/**
 * `<OAuthDivider />` — the "or continue with" rule above an OAuth row.
 *
 * @module
 */
import { defineComponent, h, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * Renders a horizontal rule with centered label text — the "or
 * continue with" divider shown between a login/signup form and the
 * OAuth button row.
 *
 * Split out as its own sub-component so the config-driven
 * `<OAuthButtons>` in `@molecule/app-auth-ui-vue` can compose it
 * above `<OAuthButtons>` (the row) without re-implementing the markup.
 *
 * Vue counterpart of `@molecule/app-oauth-buttons-react`'s
 * `OAuthDivider`, with the same props and the same DOM.
 */
export const OAuthDivider = defineComponent({
  name: 'OAuthDivider',
  props: {
    labelKey: { type: String, default: 'oauth.orContinueWith' },
    labelDefault: { type: String, default: 'or continue with' },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }), props.className),
        },
        [
          h('span', { class: cm.cn(cm.flex1, cm.separator()) }),
          h('span', t(props.labelKey, {}, { defaultValue: props.labelDefault })),
          h('span', { class: cm.cn(cm.flex1, cm.separator()) }),
        ],
      )
  },
})
