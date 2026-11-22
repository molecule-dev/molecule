/**
 * The auto-fix countdown banner — React's render section "── Auto-fix
 * countdown banner ──", shown while a verification auto-fix is about to send.
 *
 * One strip above the composer: a warning icon, the countdown (or the paused
 * label), and the Resume-or-Pause and Cancel controls. The strip and the retry
 * strip below it share one button treatment, exactly as React renders them:
 * Resume is the affirmative action (primary), Pause is pause-like (warning) and
 * Cancel is a quiet dismissal (secondary).
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the auto-fix countdown banner.
 *
 * @param ctx - The panel context (the countdown state and its dispatcher).
 * @returns The banner, or `null` while no countdown is armed.
 */
export function renderChatAutoFixBanner(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const countdown = ctx.autoFix.autoFixCountdown.value
  if (!countdown) return null

  return h(
    'div',
    {
      class: cm.cn(cm.shrink0, cm.borderT),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        fontSize: '12px',
        background: 'rgba(234,179,8,0.06)',
      },
    },
    [
      h(Icon, {
        name: 'exclamation-triangle',
        size: 14,
        'aria-hidden': 'true',
        style: { flexShrink: '0', color: '#d4a017' },
      }),
      h('span', { style: { flex: '1', opacity: '0.85' } }, [
        countdown.paused
          ? t('ide.chat.autoFixPaused', undefined, { defaultValue: 'Auto-fix paused' })
          : t(
              'ide.chat.autoFixCountdown',
              { seconds: countdown.secondsLeft },
              { defaultValue: 'Auto-fixing in {{seconds}}s...' },
            ),
      ]),
      countdown.paused
        ? h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chat-autofix-resume',
              onClick: () => {
                ctx.autoFix.dispatchAutoFix({ type: 'resume' })
              },
              class: cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
              ),
            },
            [t('ide.chat.autoFixResume', undefined, { defaultValue: 'Resume' })],
          )
        : h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chat-autofix-pause',
              onClick: () => {
                ctx.autoFix.dispatchAutoFix({ type: 'pause' })
              },
              class: cm.cn(
                cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
                cm.touchTargetCompact,
              ),
            },
            [t('ide.chat.autoFixPause', undefined, { defaultValue: 'Pause' })],
          ),
      h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'chat-autofix-cancel',
          onClick: () => {
            ctx.autoFix.dispatchAutoFix({ type: 'cancel' })
          },
          class: cm.cn(
            cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
            cm.touchTargetCompact,
          ),
        },
        [t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })],
      ),
    ],
  )
}
