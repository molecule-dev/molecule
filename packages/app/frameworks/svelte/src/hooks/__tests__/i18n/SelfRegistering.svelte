<!--
  Re-registers its own translation while rendering, the counterpart of React's
  `SelfRegistering`: registering text that is already there must not notify and
  loop. `bump` re-evaluates the component, React's second render.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import type { I18nProvider } from '@molecule/app-i18n'

  import { useT } from '../../useTranslation.js'

  let {
    provider,
    bump,
    onRender,
  }: { provider: I18nProvider; bump: Readable<number>; onRender?: () => void } = $props()

  const t = useT()

  /**
   * Registers the translation during evaluation and returns the text.
   *
   * @param current - The bump counter, read so a bump re-evaluates this expression.
   * @returns The `own` text.
   */
  function render(current: number): string {
    void current
    onRender?.()
    provider.addTranslations('en', { own: 'Own text' })
    return t('own', 'Pending')
  }
</script>

<span data-testid="own">{render($bump)}</span>
