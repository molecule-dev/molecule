<!--
  Renders the locale and the greeting from `useTranslation()`, the counterpart
  of React's control probe (`en:Hello` -> `fr:Bonjour`).
-->
<script lang="ts">
  import { useTranslation, type UseTranslationResult } from '../../useTranslation.js'

  const { t, locale }: UseTranslationResult = useTranslation()
</script>

<span data-testid="text">{$locale}:{t('greeting', undefined, { defaultValue: 'Hello' })}</span>
