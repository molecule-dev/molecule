<!--
  NoteCard: the Svelte counterpart of `@molecule/app-note-card-react`'s
  `NoteCard` — sticky-note style card with optional color tint, pinned
  indicator, and bottom-right actions. Same props (React names), same DOM for
  the same input. The root tint is applied through the CSSOM the way react-dom
  does (see `style.ts`); the accessible label of the pin indicator is the
  string React renders (`t('noteCard.aria.pinned', undefined,
  { defaultValue: 'Pinned' })`), read through `useTranslation()` so it follows
  a locale switch. With an `onClick`, an empty, transparent native
  button covers the whole card, exactly as React renders.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { type ColorVariant, getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import type { NoteCardProps } from './types.js'

  /**
   * The note tints the theme covers, and the tone each one is: a note's
   * colour is chosen by the user, so a tint from this table renders as the
   * theme's light tint of its tone (`bgTone(tone, { subtle: true })`) and
   * follows the app theme. A colour not listed has no tone — it is data,
   * applied as given.
   */
  const TINT_TONES: Record<string, ColorVariant> = {
    '#fef9c3': 'warning', // yellow note
    '#fef3c7': 'warning', // amber note (the tint this card originally shipped with)
    '#dcfce7': 'success', // green note
    '#dbeafe': 'info', // blue note
    '#fee2e2': 'error', // red note
  }

  /**
   * Resolves a note tint to the tone whose light tint the theme renders for
   * it.
   *
   * @param color - The `color` prop (any CSS colour).
   * @returns The tone, or undefined when the colour has no tone (data).
   */
  const tintTone = (color: string | undefined): ColorVariant | undefined =>
    color === undefined ? undefined : TINT_TONES[color.trim().toLowerCase()]

  let { title, body, color, pinned, modifiedAt, actions, onClick, className }: NoteCardProps =
    $props()

  // The open button's accessible name comes from the title when there is one,
  // else the body — `$props.id()` is this instance's stable id (React's
  // `useId()`).
  const nameId = $props.id()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const pinnedLabel = $derived(t('noteCard.aria.pinned', undefined, { defaultValue: 'Pinned' }))
  // The card's paper: the light tint of the note colour's tone, or the
  // warning paper when no colour is given. A colour with no tone is data —
  // it is applied as given, over the tone's paper. The text inherits the
  // theme's ink, readable on a theme tint in either mode.
  const tone = $derived(tintTone(color) ?? 'warning')
  const dataTint = $derived(tintTone(color) === undefined ? color : undefined)
  const style = $derived({
    background: dataTint,
    borderRadius: '8px',
    // The card owns its absolute children: the open button's overlay and the
    // pinned indicator both sit inside it.
    position: 'relative',
  })

  // The open button's overlay reset: an empty, transparent native button over
  // the whole card — applied through the CSSOM the way react-dom does (the
  // same `reactStyle` mechanism as the root tint), so the serialized style
  // matches React's declaration for declaration.
  const openButtonStyle = {
    background: 'transparent',
    border: 'none',
    padding: '0px',
  }
</script>

{#snippet content()}
  {#if title}
    <PresentWhileContent
      tag="h3"
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
      id={onClick ? nameId : undefined}
    >
      {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
    </PresentWhileContent>
  {/if}
  <div
    class={cm.textSize('sm')}
    style="white-space: pre-wrap"
    id={title ? undefined : onClick ? nameId : undefined}
  >
    {#if typeof body === 'function'}{@render body?.()}{:else}{body}{/if}
  </div>
{/snippet}

<article
  class={cm.cn(
    cm.stack(2),
    cm.sp('p', 3),
    cm.bgTone(tone, { subtle: true }),
    cm.shadowLifted,
    className,
  )}
  use:reactStyle={style}
>
  {#if onClick}
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="note-card-open"
      onclick={() => onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      use:reactStyle={openButtonStyle}
    ></button>
  {/if}
  {#if pinned}
    <span role="img" aria-label={pinnedLabel} style="position: absolute; top: 6px; right: 6px"
      >📌</span
    >
  {/if}
  {@render content()}
  {#if modifiedAt || actions}
    <PresentWhileContent
      tag="footer"
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        onClick ? cm.position('relative') : undefined,
      )}
      >{#if modifiedAt}<span class={cm.textSize('xs')}
          >{#if typeof modifiedAt === 'function'}{@render modifiedAt?.()}{:else}{modifiedAt}{/if}</span
        >{/if}{#if typeof actions === 'function'}{@render actions?.()}{:else}{actions}{/if}</PresentWhileContent
    >
  {/if}
</article>
