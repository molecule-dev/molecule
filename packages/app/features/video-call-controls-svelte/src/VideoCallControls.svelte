<!--
  VideoCallControls: the Svelte counterpart of
  `@molecule/app-video-call-controls-react`'s `VideoCallControls` — bottom
  controls bar for a video meeting (mute, camera, screen-share, leave). Same
  props, same i18n keys and same DOM for the same input. The screen-share
  button renders only when `onToggleScreenShare` is supplied; `extraControls`
  slots more buttons before Leave.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { VideoCallControlsProps } from './types.js'

  let {
    audioEnabled,
    onToggleAudio,
    videoEnabled,
    onToggleVideo,
    screenSharing,
    onToggleScreenShare,
    onLeave,
    extraControls,
    className,
  }: VideoCallControlsProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const classes = $derived(
    cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }), cm.sp('p', 3), className),
  )
  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the glyphs re-render on a locale switch the way React's
  // render-time `t` calls do.
  const muteGlyph = $derived(
    audioEnabled
      ? t('call.muteOn', {}, { defaultValue: '🎙' })
      : t('call.muteOff', {}, { defaultValue: '🔇' }),
  )
  const cameraGlyph = $derived(
    videoEnabled
      ? t('call.cameraOn', {}, { defaultValue: '📹' })
      : t('call.cameraOff', {}, { defaultValue: '🚫' }),
  )
  const shareGlyph = $derived(t('call.share', {}, { defaultValue: '🖥' }))
  const leaveLabel = $derived(t('call.leave', {}, { defaultValue: 'Leave' }))
</script>

<div class={classes}>
  <Button
    variant={audioEnabled ? 'solid' : 'outline'}
    onClick={onToggleAudio}
    aria-pressed={!audioEnabled}>{muteGlyph}</Button
  ><Button
    variant={videoEnabled ? 'solid' : 'outline'}
    onClick={onToggleVideo}
    aria-pressed={!videoEnabled}>{cameraGlyph}</Button
  >{#if onToggleScreenShare}<Button
      variant={screenSharing ? 'solid' : 'outline'}
      onClick={onToggleScreenShare}
      aria-pressed={!!screenSharing}>{shareGlyph}</Button
    >{/if}{#if typeof extraControls === 'function'}{@render extraControls()}{:else if extraControls}{extraControls}{/if}<Button
    variant="solid"
    color="error"
    onClick={onLeave}>{leaveLabel}</Button
  >
</div>
