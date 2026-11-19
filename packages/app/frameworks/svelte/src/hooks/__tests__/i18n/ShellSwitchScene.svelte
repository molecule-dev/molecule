<!--
  A parent that reads `useT()` and renders a child which switches the locale
  from its own mount effect: React's `Shell` around `SwitchOnMount`.
-->
<script lang="ts">
  import type { I18nProvider } from '@molecule/app-i18n'

  import { useT } from '../../useTranslation.js'
  import SwitchOnMount from './SwitchOnMount.svelte'

  let { provider, to }: { provider: I18nProvider; to: string } = $props()

  const t = useT()
</script>

<span data-testid="shell">{t('greeting', 'Hello')}</span>
<SwitchOnMount {provider} {to} />
