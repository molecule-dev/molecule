<!--
  Renders locale, direction and translated text from `useTranslation()`, the
  counterpart of React's `Detail`. `text` picks which key the body reads:
  `greeting`, `late`, or both separated by a pipe (React's `Detail`);
  `showLocale` renders the text alone, as React's probes that read only `t` do.
-->
<script lang="ts">
  import { useTranslation, type UseTranslationResult } from '../../useTranslation.js'
  import type { DetailEntry } from './types.js'

  let {
    testId = 'detail',
    text = 'greeting',
    showLocale = true,
    onRender,
  }: {
    testId?: string
    text?: 'greeting' | 'late' | 'both'
    showLocale?: boolean
    onRender?: (entry: DetailEntry) => void
  } = $props()

  const { t, locale, direction }: UseTranslationResult = useTranslation()

  /**
   * Builds this evaluation's text, recording what it saw.
   *
   * @param currentLocale - The locale store's current value.
   * @param currentDirection - The direction store's current value.
   * @returns The prefixed text, or the text alone when `showLocale` is off.
   */
  function render(currentLocale: string, currentDirection: string): string {
    let body: string
    if (text === 'greeting') {
      body = t('greeting', undefined, { defaultValue: 'Hello' })
    } else if (text === 'late') {
      body = t('late', undefined, { defaultValue: 'Pending' })
    } else {
      body = `${t('greeting', undefined, { defaultValue: 'Hello' })}|${t('late', undefined, {
        defaultValue: 'Pending',
      })}`
    }
    onRender?.({ locale: currentLocale, direction: currentDirection, text: body })
    return showLocale ? `${currentLocale}/${currentDirection}:${body}` : body
  }
</script>

<span data-testid={testId}>{render($locale, $direction)}</span>
