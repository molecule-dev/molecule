<!--
  OAuthDivider: the Svelte counterpart of `@molecule/app-oauth-buttons-react`'s
  `OAuthDivider` — a horizontal rule with centered label text, the "or
  continue with" divider shown between a login/signup form and the OAuth
  button row.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { OAuthDividerProps } from './types.js'

  let {
    labelKey = 'oauth.orContinueWith',
    labelDefault = 'or continue with',
    className,
  }: OAuthDividerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
</script>

<div class={cm.cn(cm.oauthDivider, cm.flex({ align: 'center', gap: 4 }), className)}>
  <span class={cm.cn(cm.flex1, cm.separator())}></span>
  <span>{t(labelKey, {}, { defaultValue: labelDefault })}</span>
  <span class={cm.cn(cm.flex1, cm.separator())}></span>
</div>
