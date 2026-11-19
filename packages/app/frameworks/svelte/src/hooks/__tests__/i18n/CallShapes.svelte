<!--
  Renders the existing `useT()` call shapes in one component: values,
  `defaultValue`, and count (both as values and as a pluralized default).
-->
<script lang="ts">
  import { useT } from '../../useTranslation.js'

  const t = useT()
</script>

<span data-testid="values">{t('welcome', { name: 'Alice' })}</span>
<span data-testid="default">{t('missing.key', undefined, { defaultValue: 'Fallback' })}</span>
<span data-testid="plural">{t('item', { count: 2 }, { count: 2 })}</span>
<span data-testid="count-fallback">
  {t('missing.item', undefined, { defaultValue: '{{count}} things', count: 3 })}
</span>
