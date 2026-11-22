/**
 * The 5XX backoff-retry countdown banner — React's render section "── 5XX
 * backoff-retry countdown banner", the mirror of the auto-fix banner for a
 * server-error retry.
 *
 * `useChat` surfaces `retryCountdown` only while a 5XX auto-retry is pending
 * (the error itself is held back until the retries are exhausted or the user
 * cancels), so this banner and the error message are never shown at once. Its
 * Cancel is the same button as the auto-fix strip's Cancel directly above it.
 *
 * @module
 */

import { h, type VNodeChild } from 'vue'

import { Icon } from '../Icon.js'
import type { ChatCtx } from './context.js'

/**
 * Renders the retry countdown banner.
 *
 * @param ctx - The panel context (the pending retry and its cancel action).
 * @returns The banner, or `null` while no retry is pending.
 */
export function renderChatRetryBanner(ctx: ChatCtx): VNodeChild {
  const cm = ctx.env.cm
  const t = ctx.env.t
  const retryCountdown = ctx.chat.retryCountdown.value
  if (!retryCountdown) return null

  return h(
    'div',
    {
      class: cm.cn(cm.shrink0, cm.borderT),
      'data-mol-id': 'chat-retry-countdown',
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
        t(
          'ide.chat.retryCountdown',
          { seconds: retryCountdown.secondsRemaining, attempt: retryCountdown.attempt },
          {
            defaultValue: 'Server error — retrying in {{seconds}}s… (attempt {{attempt}})',
          },
        ),
      ]),
      h(
        'button',
        {
          type: 'button',
          'data-mol-id': 'chat-retry-cancel',
          onClick: () => {
            ctx.chat.cancelRetry()
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
