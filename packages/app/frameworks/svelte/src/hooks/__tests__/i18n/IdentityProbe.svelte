<!--
  Reads `useT()`, records the function on every evaluation, and runs one effect
  that mentions the function — React's identity probe: `useEffect(..., [t])`
  must run once because `useT()` keeps one identity.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import type { UseTFunction } from '../../useTranslation.js'
  import { useT } from '../../useTranslation.js'

  let {
    bump,
    onRender,
    onEffectRun,
  }: {
    bump: Readable<number>
    onRender: (t: UseTFunction) => void
    onEffectRun: () => void
  } = $props()

  const t = useT()

  $effect(() => {
    // Depends on the translation function alone, like React's `[t]` deps list.
    void t
    onEffectRun()
  })

  /**
   * Records this evaluation's function and returns the text it renders.
   *
   * @param current - The bump counter, read so a bump re-evaluates this expression.
   * @returns The greeting.
   */
  function render(current: number): string {
    void current
    onRender(t)
    return t('greeting', 'Hello')
  }
</script>

<span data-testid="text">{render($bump)}</span>
