<!--
  PrivacyPage: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `PrivacyPage` — the default Privacy-policy
  page scaffold, with the boilerplate intro replaced by children when the app
  passes a body. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'

  import LegalPageLayout from './LegalPageLayout.svelte'
  import type { PrivacyPageProps } from './types.js'

  let {
    titleKey = 'privacy.title',
    titleDefault = 'Privacy',
    introKey = 'privacy.intro',
    introDefault = 'This is the Privacy page. Replace this placeholder with real content.',
    children,
    stackGap,
  }: PrivacyPageProps = $props()

  const { t } = useTranslation()

  const pageTitle = $derived(t(titleKey, {}, { defaultValue: titleDefault }))
  const intro = $derived(t(introKey, {}, { defaultValue: introDefault }))
</script>

<LegalPageLayout dataMolId="page-privacy" {stackGap}>
  {#snippet title()}{pageTitle}{/snippet}
  {#if children}
    {@render children?.()}
  {:else}
    <p>{intro}</p>
  {/if}
</LegalPageLayout>
