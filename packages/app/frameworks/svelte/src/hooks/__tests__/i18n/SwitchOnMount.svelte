<!--
  Switches the locale from its mount effect — React's `SwitchOnMount`. The
  effect runs after the subtree is mounted, so an earlier sibling's switch is
  announced before a later sibling first reads the provider.
-->
<script lang="ts">
  import type { I18nProvider } from '@molecule/app-i18n'

  let { provider, to }: { provider: I18nProvider; to: string } = $props()

  $effect(() => {
    void provider.setLocale(to)
  })
</script>
