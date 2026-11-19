<!--
  A parent that reads `useT()` for the `late` key and renders a child which
  registers English translations from its mount effect: React's `Shell` around
  `AddOnMount`/`AddInLayout`.
-->
<script lang="ts">
  import type { I18nProvider, Translations } from '@molecule/app-i18n'

  import { useT } from '../../useTranslation.js'
  import AddOnMount from './AddOnMount.svelte'

  let { provider, translations }: { provider: I18nProvider; translations: Translations } = $props()

  const t = useT()
</script>

<span data-testid="shell">{t('late', 'Pending')}</span>
<AddOnMount {provider} {translations} />
