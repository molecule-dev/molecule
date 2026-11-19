<!--
  A parent that reads `useTranslation()` for the `late` key with the current
  locale and direction, plus a child that registers English translations from
  its mount effect: React's `Shell` around `AddInLayout`.
-->
<script lang="ts">
  import type { I18nProvider, Translations } from '@molecule/app-i18n'

  import { useTranslation, type UseTranslationResult } from '../../useTranslation.js'
  import AddOnMount from './AddOnMount.svelte'

  let { provider, translations }: { provider: I18nProvider; translations: Translations } = $props()

  const { t, locale, direction }: UseTranslationResult = useTranslation()
</script>

<span data-testid="shell">
  {$locale}/{$direction}:{t('late', undefined, { defaultValue: 'Pending' })}
</span>
<AddOnMount {provider} {translations} />
