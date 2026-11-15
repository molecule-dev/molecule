<!--
  FlashcardCard: the Svelte counterpart of
  `@molecule/app-flashcard-card-react`'s `FlashcardCard` — front face → reveal
  back → SM-2 style grade buttons (Again / Hard / Good / Easy). Same props,
  same DOM for the same input; the front / back / progress node props are
  snippets (or plain strings).
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Card } from '@molecule/app-ui-svelte'

  import type { FlashcardCardProps, SrsGrade } from './types.js'

  let { front, back, onGrade, progress, defaultRevealed, className }: FlashcardCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  // React's `useState(!!defaultRevealed)`: the initial prop value only, read
  // once at mount — a later `defaultRevealed` change must not reveal the card.
  let revealed = $state(untrack(() => !!defaultRevealed))

  /**
   * Forwards the selected grade to the parent and resets the card to hidden.
   *
   * @param grade - The selected SM-2 grade.
   */
  function grade(grade: SrsGrade): void {
    onGrade?.(grade)
    revealed = false
  }
</script>

<Card {className}>
  <div class={cm.stack(4)}>
    {#if progress}
      <div class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)}>
        {#if typeof progress === 'function'}{@render progress()}{:else}{progress}{/if}
      </div>
    {/if}
    <div class={cm.cn(cm.sp('p', 6), cm.textCenter, cm.cn(cm.textSize('xl')))}>
      {#if revealed}
        {#if typeof back === 'function'}{@render back()}{:else}{back}{/if}
      {:else}
        {#if typeof front === 'function'}{@render front()}{:else}{front}{/if}
      {/if}
    </div>
    {#if revealed}
      <div class={cm.grid({ cols: 4, gap: 'sm' })}>
        <Button variant="outline" color="error" onClick={() => grade('again')}>
          {t('flashcard.again', {}, { defaultValue: 'Again' })}
        </Button>
        <Button variant="outline" color="warning" onClick={() => grade('hard')}>
          {t('flashcard.hard', {}, { defaultValue: 'Hard' })}
        </Button>
        <Button variant="outline" color="primary" onClick={() => grade('good')}>
          {t('flashcard.good', {}, { defaultValue: 'Good' })}
        </Button>
        <Button variant="outline" color="success" onClick={() => grade('easy')}>
          {t('flashcard.easy', {}, { defaultValue: 'Easy' })}
        </Button>
      </div>
    {:else}
      <Button variant="solid" color="primary" onClick={() => (revealed = true)}>
        {t('flashcard.reveal', {}, { defaultValue: 'Show answer' })}
      </Button>
    {/if}
  </div>
</Card>
