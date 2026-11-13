<!--
  Translated text written the three ways a component reads it: `useTranslation().t`
  and `useT()` called straight in markup, and the `createI18nStores()` `$t` store.
-->
<script lang="ts">
  import { useT, useTranslation } from '../../hooks/useTranslation.js'
  import { createI18nStores } from '../../stores/i18n.js'

  const { t } = useTranslation()
  const tShort = useT()
  const { t: tStore } = createI18nStores()
</script>

<p data-via="useTranslation">{t('greeting', undefined, { defaultValue: 'Hello' })}</p>
<p data-via="useT">{tShort('farewell', 'Goodbye')}</p>
<p data-via="createI18nStores">{$tStore('greeting', undefined, { defaultValue: 'Hello' })}</p>
