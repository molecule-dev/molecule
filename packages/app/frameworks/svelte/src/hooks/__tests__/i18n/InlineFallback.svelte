<!--
  Renders the shorthand `useT()` form: a string second argument is the inline
  English `defaultValue`, with interpolation and pluralization still working.
-->
<script lang="ts">
  import { useT } from '../../useTranslation.js'

  const t = useT()
</script>

<span data-testid="fallback">{t('missing.key', 'English fallback')}</span>
<span data-testid="translated">{t('greeting', 'English fallback')}</span>
<span data-testid="interpolated">{t('missing.template', '{{count}} items', { count: 3 })}</span>
<span data-testid="plural">{t('item', '{{count}} things', { count: 1 })}</span>
