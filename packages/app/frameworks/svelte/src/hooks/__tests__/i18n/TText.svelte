<!--
  Renders one translated key through `useT()`, using the inline-fallback call
  form React's `Greeting`/`LateText` probes use. `onRender` receives the
  function on every evaluation, so a test can read the identity the component
  saw and count the evaluations.
-->
<script lang="ts">
  import type { UseTFunction } from '../../useTranslation.js'
  import { useT } from '../../useTranslation.js'

  let {
    textKey,
    fallback,
    testId,
    onRender,
  }: {
    textKey: string
    fallback: string
    testId: string
    onRender?: (t: UseTFunction) => void
  } = $props()

  const t = useT()

  /**
   * Records this evaluation's function and returns the text it renders.
   *
   * @returns The translated text.
   */
  function render(): string {
    onRender?.(t)
    return t(textKey, fallback)
  }
</script>

<span data-testid={testId}>{render()}</span>
