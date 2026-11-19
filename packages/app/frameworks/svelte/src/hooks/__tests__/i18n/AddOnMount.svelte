<!--
  Registers English translations from its mount effect — React's `AddOnMount`.
-->
<script lang="ts">
  import type { I18nProvider, Translations } from '@molecule/app-i18n'

  let { provider, translations }: { provider: I18nProvider; translations: Translations } = $props()

  $effect(() => {
    provider.addTranslations('en', translations)
  })
</script>
