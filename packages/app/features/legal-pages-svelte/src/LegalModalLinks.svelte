<!--
  LegalModalLinks: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `LegalModalLinks` — Privacy/Terms
  trigger buttons that open IN-PLACE modals showing the bonded legal HTML
  instead of navigating. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Modal } from '@molecule/app-ui-svelte'

  import { escapeHtml } from './html.js'
  import { innerHtml } from './inner-html.js'
  import type { LegalModalLinksProps } from './types.js'

  let {
    linkClassName,
    show = 'both',
    privacyLabel,
    termsLabel,
    appName,
    loadContent,
  }: LegalModalLinksProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let privacyOpen = $state(false)
  let termsOpen = $state(false)

  // Every translated string is `$derived`: `t` reads the i18n state under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const privacyTitle = $derived(t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' }))
  const termsTitle = $derived(t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' }))
  const privacyHtml = $derived(
    t('content.privacyPolicy', appName ? { appName: escapeHtml(appName) } : {}, {
      defaultValue: '',
    }),
  )
  const termsHtml = $derived(
    t('content.termsOfService', appName ? { appName: escapeHtml(appName) } : {}, {
      defaultValue: '',
    }),
  )

  /**
   * Opens the Privacy modal, lazy-loading the catalog body first when the app
   * supplied a preloader — exactly React's `openPrivacy`.
   */
  async function openPrivacy(): Promise<void> {
    if (loadContent) await loadContent('privacyPolicy')
    privacyOpen = true
  }

  /**
   * Opens the Terms modal, lazy-loading the catalog body first when the app
   * supplied a preloader — exactly React's `openTerms`.
   */
  async function openTerms(): Promise<void> {
    if (loadContent) await loadContent('termsOfService')
    termsOpen = true
  }
</script>

{#if show !== 'terms'}
  <button type="button" class={linkClassName} onclick={openPrivacy}>
    {#if privacyLabel}{@render privacyLabel()}{:else}{privacyTitle}{/if}
  </button>
{/if}{#if show !== 'privacy'}
  <button type="button" class={linkClassName} onclick={openTerms}>
    {#if termsLabel}{@render termsLabel()}{:else}{termsTitle}{/if}
  </button>
{/if}<Modal
  open={privacyOpen}
  onClose={() => {
    privacyOpen = false
  }}
  title={privacyTitle}
  size="lg"
>
  <div class={cm.prose} use:innerHtml={privacyHtml}></div>
</Modal><Modal
  open={termsOpen}
  onClose={() => {
    termsOpen = false
  }}
  title={termsTitle}
  size="lg"
>
  <div class={cm.prose} use:innerHtml={termsHtml}></div>
</Modal>
