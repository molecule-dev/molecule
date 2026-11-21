<!--
  LegalModals: the two in-place Privacy / Terms modals `useLegalModals()`
  returns, rendered from the api's open state. The Svelte shape of React's
  `modals` element pair — a snippet cannot be built outside a component, so the
  pair ships as this component and the hook names it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Modal } from '@molecule/app-ui-svelte'

  import { escapeHtml } from './html.js'
  import { innerHtml } from './inner-html.js'
  import type { LegalModalsApi } from './types.js'

  let { api }: { api: LegalModalsApi } = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const privacyTitle = $derived(t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' }))
  const termsTitle = $derived(t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' }))
  const privacyHtml = $derived(
    t(
      'content.privacyPolicy',
      api.state.appName ? { appName: escapeHtml(api.state.appName) } : {},
      { defaultValue: '' },
    ),
  )
  const termsHtml = $derived(
    t(
      'content.termsOfService',
      api.state.appName ? { appName: escapeHtml(api.state.appName) } : {},
      { defaultValue: '' },
    ),
  )
</script>

<Modal
  open={api.state.privacyOpen}
  onClose={() => {
    api.state.privacyOpen = false
  }}
  title={privacyTitle}
  size="lg"
>
  <div class={cm.prose} use:innerHtml={privacyHtml}></div>
</Modal>
<Modal
  open={api.state.termsOpen}
  onClose={() => {
    api.state.termsOpen = false
  }}
  title={termsTitle}
  size="lg"
>
  <div class={cm.prose} use:innerHtml={termsHtml}></div>
</Modal>
