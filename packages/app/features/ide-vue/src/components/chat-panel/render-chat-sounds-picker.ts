/**
 * The sounds picker popup — React's render section "Sounds picker popup": the
 * `/sounds` command's notification-sound preference list.
 *
 * The "All" row summarizes every event (or says "mixed" when they differ) and
 * cycles all of them together; each per-event row cycles its own mode and names
 * the event with its description through the shared panel-logic translators.
 * Owned by U11, nested inside the input area.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { DEFAULT_AGENT_NAME } from '@molecule/app-ai-chat'
import {
  SOUND_EVENTS,
  soundEventDescription,
  soundEventLabel,
  soundModeLabel,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx } from './context.js'

/**
 * Renders the sounds picker.
 *
 * @param ctx - The panel context (the open picker, the sound preference and the
 *   agent's display name the descriptions use).
 * @returns The picker, or `null` while it is closed.
 */
export function renderChatSoundsPicker(ctx: ChatCtx): VNodeChild {
  const soundsPicker = ctx.sounds.soundsPicker.value
  if (!soundsPicker) return null
  const cm = ctx.env.cm
  const t = ctx.env.t
  const isCoarse = ctx.env.isCoarse.value
  const soundsConfig = ctx.sounds.soundsConfig.value
  const agentName = ctx.props.agentName ?? DEFAULT_AGENT_NAME

  return h(
    'div',
    {
      class: cm.cn(cm.surface, cm.borderAll),
      style: {
        position: 'absolute',
        bottom: '100%',
        left: '0px',
        right: '0px',
        marginBottom: '0px',
        borderRadius: '6px 6px 0 0',
        zIndex: '100',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: ctx.env.popupMaxHeight.value,
      },
    },
    [
      h(
        'div',
        {
          class: cm.cn(cm.textSize('xs'), cm.textMuted),
          style: {
            padding: '5px 12px',
            borderBottom: '1px solid rgba(128,128,128,0.12)',
            flexShrink: '0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        },
        [
          h('span', [
            t('ide.chat.notificationSounds', undefined, {
              defaultValue: 'Notification sounds',
            }),
          ]),
          h(
            'button',
            {
              // mol-bespoke-button: icon-only picker close — header x, no label
              type: 'button',
              onClick: () => ctx.sounds.setSoundsPicker(null),
              style: {
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0 2px',
                fontSize: '14px',
                lineHeight: '1',
                opacity: '0.6',
                // Touch floor for this secondary header ✕ (36px, like the
                // notice-card actions); fine pointers keep the slim header.
                ...(isCoarse
                  ? {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '36px',
                      minHeight: '36px',
                    }
                  : {}),
              },
            },
            ['✕'],
          ),
        ],
      ),
      h('div', { style: { overflowY: 'auto', flex: '1' } }, [
        // "All" row.
        (() => {
          const allModes = SOUND_EVENTS.map((event) => soundsConfig[event])
          const allSame = allModes.every((mode) => mode === allModes[0])
          const currentMode = allSame ? allModes[0] : null
          const badgeColor =
            currentMode === 'always'
              ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
              : currentMode === 'whenNotFocused'
                ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
                : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }
          const modeLabel = allSame
            ? soundModeLabel(t, allModes[0])
            : t('ide.chat.soundMode.mixed', undefined, { defaultValue: 'mixed' })
          return h(
            'button',
            {
              // mol-bespoke-button: sounds "All" row — full-width list item in the /sounds popup
              type: 'button',
              onClick: () => {
                void ctx.sounds.cycleSoundMode('all')
              },
              onMouseenter: (event: MouseEvent) => {
                const el = event.currentTarget
                if (el instanceof HTMLElement) el.style.background = 'rgba(128,128,128,0.15)'
              },
              onMouseleave: (event: MouseEvent) => {
                const el = event.currentTarget
                if (el instanceof HTMLElement)
                  el.style.background =
                    soundsPicker.selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent'
              },
              class: cm.w('full'),
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '55px',
                padding: '8px 12px',
                border: 'none',
                borderBottom: '1px solid rgba(128,128,128,0.12)',
                cursor: 'pointer',
                color: 'inherit',
                textAlign: 'left',
                fontSize: '13px',
                background:
                  soundsPicker.selectedIdx === 0 ? 'rgba(128,128,128,0.1)' : 'transparent',
              },
            },
            [
              h('span', { class: cm.fontWeight('medium') }, [
                t('ide.chat.soundAll', undefined, { defaultValue: 'All' }),
              ]),
              h(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    background: badgeColor.bg,
                    color: badgeColor.fg,
                    padding: '1px 6px',
                    borderRadius: '3px',
                  },
                },
                [modeLabel],
              ),
            ],
          )
        })(),
        // Per-event rows.
        ...SOUND_EVENTS.map((eventType, idx) => {
          const rowIdx = idx + 1
          const mode = soundsConfig[eventType]
          const badgeColor =
            mode === 'always'
              ? { bg: 'rgba(34,197,94,0.2)', fg: 'rgb(34,197,94)' }
              : mode === 'whenNotFocused'
                ? { bg: 'rgba(234,179,8,0.2)', fg: 'rgb(202,138,4)' }
                : { bg: 'rgba(128,128,128,0.2)', fg: 'inherit' }
          return h(
            'button',
            {
              // mol-bespoke-button: sounds per-event row — full-width list item in the /sounds popup
              key: eventType,
              type: 'button',
              onClick: () => {
                void ctx.sounds.cycleSoundMode(eventType)
              },
              onMouseenter: (event: MouseEvent) => {
                const el = event.currentTarget
                if (el instanceof HTMLElement) el.style.background = 'rgba(128,128,128,0.15)'
              },
              onMouseleave: (event: MouseEvent) => {
                const el = event.currentTarget
                if (el instanceof HTMLElement)
                  el.style.background =
                    soundsPicker.selectedIdx === rowIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
              },
              class: cm.w('full'),
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '55px',
                padding: '8px 12px 8px 24px',
                border: 'none',
                borderTop: '1px solid rgba(128,128,128,0.12)',
                cursor: 'pointer',
                color: 'inherit',
                textAlign: 'left',
                fontSize: '13px',
                background:
                  soundsPicker.selectedIdx === rowIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
              },
            },
            [
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                },
                [
                  h('span', [soundEventLabel(t, eventType)]),
                  h(
                    'span',
                    {
                      style: {
                        fontSize: '11px',
                        background: badgeColor.bg,
                        color: badgeColor.fg,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        flexShrink: '0',
                      },
                    },
                    [soundModeLabel(t, mode)],
                  ),
                ],
              ),
              h(
                'div',
                {
                  class: cm.textMuted,
                  style: { fontSize: '11px', marginTop: '2px', opacity: '0.7' },
                },
                [soundEventDescription(t, eventType, { agentName })],
              ),
            ],
          )
        }),
      ]),
    ],
  )
}
