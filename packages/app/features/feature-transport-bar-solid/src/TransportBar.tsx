import type { Component, JSX } from 'solid-js'
import { Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { TransportBarProps } from './types.js'

/**
 * Transport-control bar (play / pause / stop / record / skip / loop) used by
 * music-daw + video-editor surfaces for editor playback control. Renders a
 * horizontal bar of buttons with semantic icons and fully translated
 * `aria-label`s; an optional time-display slot lets callers render the current
 * playhead position / total duration without coupling the bar to any specific
 * time-format library.
 *
 * Solid counterpart of `@molecule/app-feature-transport-bar-react`'s
 * `TransportBar` — the same props (React names), the same DOM for the same
 * input, and the same callbacks.
 *
 * @param props - Component props (see {@link TransportBarProps}).
 * @returns The rendered transport bar.
 */
export const TransportBar: Component<TransportBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // React's inline style object: only properties ClassMap does not expose
  // (background:transparent, border:none). Solid applies it through the CSSOM,
  // as React does, so it serializes identically.
  const buttonBaseStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  } as const

  /** React's `canStop = true` default parameter, read per render. */
  const canStop = (): boolean => props.canStop ?? true
  /** React's `canSkip = true` default parameter, read per render. */
  const canSkip = (): boolean => props.canSkip ?? true
  /** React's `cm.cn(cm.cursorPointer, cm.sp('p', 1))` for every control. */
  const controlClass = (): string => cm.cn(cm.cursorPointer, cm.sp('p', 1))

  return (
    <div
      role="toolbar"
      aria-label={t(
        'transportBar.aria.region',
        {},
        { defaultValue: 'Playback transport controls' },
      )}
      data-mol-id="transport-bar"
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 2), props.className)}
    >
      <Show when={props.onSkipBack}>
        <button
          type="button"
          onClick={(event: MouseEvent) => props.onSkipBack?.(event)}
          disabled={!canSkip()}
          aria-label={t('transportBar.aria.skipBack', {}, { defaultValue: 'Skip backward' })}
          data-mol-id="transport-bar-skip-back"
          class={controlClass()}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'⏮'}</span>
        </button>
      </Show>
      <button
        type="button"
        onClick={(event: MouseEvent) => props.onPlayToggle(event)}
        aria-label={
          props.isPlaying
            ? t('transportBar.aria.pause', {}, { defaultValue: 'Pause' })
            : t('transportBar.aria.play', {}, { defaultValue: 'Play' })
        }
        aria-pressed={props.isPlaying}
        data-mol-id="transport-bar-play-toggle"
        data-state={props.isPlaying ? 'playing' : 'paused'}
        class={controlClass()}
        style={buttonBaseStyle}
      >
        <span aria-hidden="true">{props.isPlaying ? '⏸' : '▶'}</span>
      </button>
      <button
        type="button"
        onClick={(event: MouseEvent) => props.onStop(event)}
        disabled={!canStop()}
        aria-label={t('transportBar.aria.stop', {}, { defaultValue: 'Stop' })}
        data-mol-id="transport-bar-stop"
        class={controlClass()}
        style={buttonBaseStyle}
      >
        <span aria-hidden="true">{'⏹'}</span>
      </button>
      <Show when={props.onSkipForward}>
        <button
          type="button"
          onClick={(event: MouseEvent) => props.onSkipForward?.(event)}
          disabled={!canSkip()}
          aria-label={t('transportBar.aria.skipForward', {}, { defaultValue: 'Skip forward' })}
          data-mol-id="transport-bar-skip-forward"
          class={controlClass()}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'⏭'}</span>
        </button>
      </Show>
      <Show when={props.onRecordToggle}>
        <button
          type="button"
          onClick={(event: MouseEvent) => props.onRecordToggle?.(event)}
          aria-label={
            props.isRecording
              ? t('transportBar.aria.stopRecording', {}, { defaultValue: 'Stop recording' })
              : t('transportBar.aria.record', {}, { defaultValue: 'Record' })
          }
          aria-pressed={!!props.isRecording}
          data-mol-id="transport-bar-record-toggle"
          data-state={props.isRecording ? 'recording' : 'idle'}
          class={controlClass()}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'●'}</span>
        </button>
      </Show>
      <Show when={props.onLoopToggle}>
        <button
          type="button"
          onClick={(event: MouseEvent) => props.onLoopToggle?.(event)}
          aria-label={
            props.loop
              ? t('transportBar.aria.loopOn', {}, { defaultValue: 'Disable loop' })
              : t('transportBar.aria.loopOff', {}, { defaultValue: 'Enable loop' })
          }
          aria-pressed={!!props.loop}
          data-mol-id="transport-bar-loop-toggle"
          data-state={props.loop ? 'on' : 'off'}
          class={controlClass()}
          style={buttonBaseStyle}
        >
          <span aria-hidden="true">{'↻'}</span>
        </button>
      </Show>
      <ResolveNode node={props.timeDisplay}>
        {(timeDisplay, hasTimeDisplay) => (
          // React's `slot(timeDisplay) ?? slot(children)`: children are not read (or created)
          // while the time display wins.
          <ResolveNode node={hasTimeDisplay() ? undefined : props.children}>
            {(childNodes, hasChildren) => {
              /**
               * React's `slot(timeDisplay) ?? slot(children)`, decided from each slot's present
               * accessor so an emptied list falls back like an omitted prop.
               */
              const slotValue = (): unknown =>
                hasTimeDisplay() ? timeDisplay() : hasChildren() ? childNodes() : undefined
              return (
                <Show
                  when={Boolean(slotValue())}
                  fallback={
                    typeof slotValue() === 'number' ? (slotValue() as JSX.Element) : undefined
                  }
                >
                  <div
                    data-mol-id="transport-bar-time-display"
                    class={cm.cn(cm.textSize('sm'), cm.sp('px', 2))}
                  >
                    {slotValue() as JSX.Element}
                  </div>
                </Show>
              )
            }}
          </ResolveNode>
        )}
      </ResolveNode>
    </div>
  )
}
