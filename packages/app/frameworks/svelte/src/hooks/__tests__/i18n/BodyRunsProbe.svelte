<!--
  Reads `useTranslation()` and records the translation function, the locales
  list and the text of every evaluation, the counterpart of React's
  body-runs recorder. `bump` re-evaluates the component without notifying the
  provider, React's ordinary re-render.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import { useTranslation, type UseTranslationResult } from '../../useTranslation.js'
  import type { RunSnapshot } from './types.js'

  let { bump, onRun }: { bump: Readable<number>; onRun: (snapshot: RunSnapshot) => void } = $props()

  // `$locales` is the store read a component does: one list per notification and
  // the same list across an ordinary re-evaluation, as React's snapshot holds.
  const { t, locales }: UseTranslationResult = useTranslation()

  /**
   * Records this evaluation and returns the text it rendered.
   *
   * @param current - The bump counter, read so a bump re-evaluates this expression.
   * @returns The greeting.
   */
  function render(current: number): string {
    void current
    const text = t('greeting')
    onRun({ t, locales: $locales, text })
    return text
  }
</script>

<span data-testid="text">{render($bump)}</span>
