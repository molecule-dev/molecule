<!--
  TermsPage: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `TermsPage` — the default Terms-of-service
  page scaffold, with the boilerplate intro replaced by children when the app
  passes a real body. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'

  import LegalPageLayout from './LegalPageLayout.svelte'
  import type { TermsPageProps } from './types.js'

  let {
    titleKey = 'terms.title',
    titleDefault = 'Terms',
    introKey = 'terms.intro',
    introDefault = 'This is the Terms page. Replace this placeholder with real content.',
    children,
    stackGap,
  }: TermsPageProps = $props()

  const { t } = useTranslation()

  const pageTitle = $derived(t(titleKey, {}, { defaultValue: titleDefault }))
  const intro = $derived(t(introKey, {}, { defaultValue: introDefault }))
</script>

<LegalPageLayout dataMolId="page-terms" {stackGap}>
  {#snippet title()}{pageTitle}{/snippet}
  {#if children}
    {@render children?.()}
  {:else}
    <p>{intro}</p>
  {/if}
</LegalPageLayout>
