/**
 * The `/sounds` picker popup — React's render section "Sounds picker popup".
 *
 * One row per sound event, each cycling its mode (off → when not focused →
 * always) and persisting to this device, plus an "All" row that cycles every
 * event at once. The badge tint follows the row's current mode, and the "All"
 * row reads "mixed" while the events disagree.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'

import { DEFAULT_AGENT_NAME } from '@molecule/app-ai-chat'
import type { SoundMode } from '@molecule/app-ide-panel-logic/panels'
import {
  SOUND_EVENTS,
  soundEventDescription,
  soundEventLabel,
  soundModeLabel,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatSoundsPicker}. */
export interface ChatSoundsPickerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Keeps every inline declaration on the CSSOM path.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * `flex`/`border` shorthand and `background` serialize differently, and jsdom's
 * raw-text parser can drop a declaration entirely. Calling through this
 * identity function keeps every declaration on the CSSOM path, so the rendered
 * `style` attribute is the one React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/**
 * The badge tint of one sound mode.
 * @param mode - The mode (or null while the events disagree).
 * @returns The badge's background and text colors.
 */
function badgeColor(mode: SoundMode | null): { bg: string; fg: string } {
  return mode === 'always'
    ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
    : mode === 'whenNotFocused'
      ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
      : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }
}

/**
 * Renders the sounds picker.
 * @param props - The inner ctx (the open picker and the per-device sound modes).
 * @returns The picker, or nothing while it is closed.
 */
export function ChatSoundsPicker(props: ChatSoundsPickerProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env
  const agentName = (): string => ctx.props.agentName ?? DEFAULT_AGENT_NAME

  /**
   * The close button's style — the slim header control, with a touch floor on a
   * coarse pointer.
   * @returns The close button's style.
   */
  const closeStyle = (): JSX.CSSProperties => {
    const base: JSX.CSSProperties = {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      padding: '0 2px',
      'font-size': '14px',
      'line-height': 1,
      opacity: 0.6,
    }
    return ctx.env.isCoarse()
      ? {
          ...base,
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-width': '36px',
          'min-height': '36px',
        }
      : base
  }

  /** Every event's current mode, in the events' order. */
  const allModes = (): SoundMode[] => SOUND_EVENTS.map((event) => ctx.sounds.soundsConfig()[event])

  /**
   * Whether every event shares one mode.
   * @returns True when the events all agree.
   */
  const allSame = (): boolean => {
    const modes = allModes()
    return modes.every((mode) => mode === modes[0])
  }

  return (
    <Show when={ctx.sounds.soundsPicker()}>
      {(picker) => (
        <div
          class={cm.cn(cm.surface, cm.borderAll)}
          style={styleOf({
            position: 'absolute',
            bottom: '100%',
            left: '0px',
            right: '0px',
            'margin-bottom': '0px',
            'border-radius': '6px 6px 0 0',
            'z-index': 100,
            'box-shadow': '0 -4px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            'flex-direction': 'column',
            'max-height': ctx.env.popupMaxHeight(),
          })}
        >
          <div
            class={cm.cn(cm.textSize('xs'), cm.textMuted)}
            style={styleOf({
              padding: '5px 12px',
              'border-bottom': '1px solid rgba(128,128,128,0.12)',
              'flex-shrink': '0',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
            })}
          >
            <span>
              {t('ide.chat.notificationSounds', undefined, {
                defaultValue: 'Notification sounds',
              })}
            </span>
            <button
              /* mol-bespoke-button: icon-only picker close — header x, no label */
              type="button"
              onClick={() => ctx.sounds.setSoundsPicker(null)}
              style={closeStyle()}
            >
              {'✕'}
            </button>
          </div>
          <div style={styleOf({ 'overflow-y': 'auto', flex: '1' })}>
            {/* "All" row */}
            <button
              /* mol-bespoke-button: sounds "All" row — full-width list item in the /sounds popup */
              type="button"
              onClick={() => void ctx.sounds.cycleSoundMode('all')}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background =
                  picker().selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent'
              }}
              class={cm.w('full')}
              style={styleOf({
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                'min-height': '55px',
                padding: '8px 12px',
                border: 'none',
                'border-bottom': '1px solid rgba(128,128,128,0.12)',
                cursor: 'pointer',
                color: 'inherit',
                'text-align': 'left',
                'font-size': '13px',
                background: picker().selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent',
              })}
            >
              <span class={cm.fontWeight('medium')}>
                {t('ide.chat.soundAll', undefined, { defaultValue: 'All' })}
              </span>
              <span
                style={styleOf({
                  'font-size': '11px',
                  background: badgeColor(allSame() ? allModes()[0] : null).bg,
                  color: badgeColor(allSame() ? allModes()[0] : null).fg,
                  padding: '1px 6px',
                  'border-radius': '3px',
                })}
              >
                {allSame()
                  ? soundModeLabel(t, allModes()[0])
                  : t('ide.chat.soundMode.mixed', undefined, { defaultValue: 'mixed' })}
              </span>
            </button>
            {/* Per-event rows */}
            <For each={SOUND_EVENTS}>
              {(eventType, idx) => {
                const rowIdx = (): number => idx() + 1
                const mode = (): SoundMode => ctx.sounds.soundsConfig()[eventType]
                return (
                  <button
                    /* mol-bespoke-button: sounds per-event row — full-width list item in the /sounds popup */
                    type="button"
                    onClick={() => void ctx.sounds.cycleSoundMode(eventType)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        picker().selectedIdx === rowIdx() ? 'rgba(128,128,128,0.1)' : 'transparent'
                    }}
                    class={cm.w('full')}
                    style={styleOf({
                      display: 'flex',
                      'flex-direction': 'column',
                      'justify-content': 'center',
                      'min-height': '55px',
                      padding: '8px 12px 8px 24px',
                      border: 'none',
                      'border-top': '1px solid rgba(128,128,128,0.12)',
                      cursor: 'pointer',
                      color: 'inherit',
                      'text-align': 'left',
                      'font-size': '13px',
                      background:
                        picker().selectedIdx === rowIdx() ? 'rgba(128,128,128,0.1)' : 'transparent',
                    })}
                  >
                    <div
                      style={styleOf({
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'space-between',
                      })}
                    >
                      <span>{soundEventLabel(t, eventType)}</span>
                      <span
                        style={styleOf({
                          'font-size': '11px',
                          background: badgeColor(mode()).bg,
                          color: badgeColor(mode()).fg,
                          padding: '1px 6px',
                          'border-radius': '3px',
                          'flex-shrink': '0',
                        })}
                      >
                        {soundModeLabel(t, mode())}
                      </span>
                    </div>
                    <div
                      class={cm.textMuted}
                      style={styleOf({ 'font-size': '11px', 'margin-top': '2px', opacity: 0.7 })}
                    >
                      {soundEventDescription(t, eventType, { agentName: agentName() })}
                    </div>
                  </button>
                )
              }}
            </For>
          </div>
        </div>
      )}
    </Show>
  )
}
