/**
 * The 5XX backoff-retry countdown banner — React's render section “── 5XX
 * backoff-retry countdown banner”, the mirror of the auto-fix banner for a
 * server-error retry.
 *
 * The chat session surfaces `retryCountdown` only while a 5XX auto-retry is
 * pending (the error itself is held back until the retries are exhausted or
 * the user cancels), so this banner and the error message below it are never
 * shown at once. Its Cancel is the same button as the auto-fix strip's Cancel
 * directly above it.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { Icon } from '../Icon.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatRetryBanner}. */
export interface ChatRetryBannerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the retry countdown banner.
 * @param props - The inner ctx (the pending retry and its cancel action).
 * @returns The banner, or nothing while no retry is pending.
 */
export function ChatRetryBanner(props: ChatRetryBannerProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const t = ctx.env.t

  return (
    <Show when={ctx.chat.retryCountdown()}>
      {(retryCountdown) => (
        <div
          class={cm.cn(cm.shrink0, cm.borderT)}
          data-mol-id="chat-retry-countdown"
          style={{
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
            padding: '6px 12px',
            'font-size': '12px',
            background: 'rgba(234, 179, 8, 0.06)',
          }}
        >
          <Icon
            name="exclamation-triangle"
            size={14}
            aria-hidden="true"
            style={{ 'flex-shrink': '0', color: 'rgb(212, 160, 23)' }}
          />
          <span style={{ flex: '1 1 0%', opacity: '0.85' }}>
            {t(
              'ide.chat.retryCountdown',
              {
                seconds: retryCountdown().secondsRemaining,
                attempt: retryCountdown().attempt,
              },
              {
                defaultValue: 'Server error — retrying in {{seconds}}s… (attempt {{attempt}})',
              },
            )}
          </span>
          <button
            type="button"
            data-mol-id="chat-retry-cancel"
            onClick={() => {
              ctx.chat.cancelRetry()
            }}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
              cm.touchTargetCompact,
            )}
          >
            {t('ide.chat.autoFixCancel', undefined, { defaultValue: 'Cancel' })}
          </button>
        </div>
      )}
    </Show>
  )
}
