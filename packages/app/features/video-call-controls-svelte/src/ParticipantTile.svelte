<!--
  ParticipantTile: the Svelte counterpart of
  `@molecule/app-video-call-controls-react`'s `ParticipantTile` — single
  participant card for a video grid. Same props, same DOM for the same input.
  Apps supply the video element through the `videoSlot` snippet and a fallback
  through `avatarSlot`; the node props are snippets (or plain strings).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ParticipantTileProps } from './types.js'

  /** The centered media layer's inline style, exactly as React writes it. */
  const CENTER_STYLE =
    'position: absolute; inset: 0px; display: flex; align-items: center; justify-content: center'

  /** The name badge's inline style, exactly as React writes it. */
  const BADGE_STYLE =
    'position: absolute; left: 8px; bottom: 8px; padding: 2px 6px; border-radius: 4px; font-size: 12px'

  /** The indicators row's inline style, exactly as React writes it. */
  const INDICATORS_STYLE = 'position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px'

  /** One indicator glyph's inline style, exactly as React writes it. */
  const ICON_STYLE = 'font-size: 12px'

  let {
    name,
    videoSlot,
    avatarSlot,
    audioEnabled = true,
    handRaised,
    speaking,
    isLocal,
    className,
  }: ParticipantTileProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the labels re-render on a locale switch the way React's
  // render-time `t` calls do.
  const mutedLabel = $derived(t('call.aria.muted', {}, { defaultValue: 'Muted' }))
  const handRaisedLabel = $derived(t('call.aria.handRaised', {}, { defaultValue: 'Hand raised' }))

  /** The tile canvas's inline style, with the speaking ring when speaking. */
  const rootStyle = $derived(
    [
      'aspect-ratio: 16 / 9',
      'border-radius: 8px',
      'overflow: hidden',
      ...(speaking ? ['outline: 3px solid currentColor'] : []),
    ].join('; '),
  )

  /** React's root classes: the tile surface plus the success-tone speaking ring. */
  const rootClass = $derived(
    cm.cn(
      cm.position('relative'),
      cm.surface,
      speaking ? cm.textTone('success') : undefined,
      className,
    ),
  )

  /** React's badge classes: the media scrim with readable inverse text. */
  const badgeClass = $derived(cm.cn(cm.bgScrim, cm.textOnTone))

  /** React's `' (you)'` suffix for the local participant. */
  const youSuffix = $derived(` ${t('call.label.you', {}, { defaultValue: '(you)' })}`)
</script>

<div class={rootClass} style={rootStyle}>
  <div style={CENTER_STYLE}>
    {#if typeof videoSlot === 'function'}{@render videoSlot()}{:else if videoSlot}{videoSlot}{:else if typeof avatarSlot === 'function'}{@render avatarSlot()}{:else if avatarSlot}{avatarSlot}{/if}
  </div>
  <div class={badgeClass} style={BADGE_STYLE}>
    {#if typeof name === 'function'}{@render name()}{:else}{name}{/if}{#if isLocal}{youSuffix}{/if}
  </div>
  <div style={INDICATORS_STYLE}>
    {#if !audioEnabled}<span aria-label={mutedLabel} style={ICON_STYLE}>🔇</span>{/if}
    {#if handRaised}<span aria-label={handRaisedLabel} style={ICON_STYLE}>✋</span>{/if}
  </div>
</div>
