<script lang="ts">
  import { useTheme } from '../../hooks/useTheme.js'
  import { useTranslation } from '../../hooks/useTranslation.js'

  const { theme } = useTheme()
  const { t } = useTranslation()
</script>

<p>{$theme.name}: {t('restoring')}</p>
