/**
 * The auto-fix countdown banner — React's render section “── Auto-fix
 * countdown banner ──”, shown while a verification auto-fix is about to send.
 *
 * One strip above the composer: a warning icon, the countdown (or the paused
 * label), and the Resume-or-Pause and Cancel controls. This strip and the
 * retry strip below it share one button treatment, exactly as React renders
 * them: Resume is the affirmative action (primary), its sibling Pause is
 * pause-like (warning), and the Cancels are quiet dismissals (secondary).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { Icon } from '../Icon.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatAutoFixBanner}. */
export interface ChatAutoFixBannerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the auto-fix countdown banner.
 * @param props - The inner ctx (the countdown state and its dispatcher).
 * @returns The banner, or nothing while no countdown is armed.
 */
export function ChatAutoFixBanner(props: ChatAutoFixBannerProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm
  const t = ctx.env.t

  return (
    <Show when={ctx.autoFix.autoFixCountdown()}>
      {(countdown) => (
        <div
          class={cm.cn(cm.shrink0, cm.borderT)}
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
            {countdown().paused
              ? t('ide.chat.autoFixPaused', undefined, { defaultValue: 'Auto-fix paused' })
              : t(
                  'ide.chat.autoFixCountdown',
                  { seconds: countdown().secondsLeft },
                  { defaultValue: 'Auto-fixing in {{seconds}}s...' },
                )}
          </span>
          <Show
            when={countdown().paused}
            fallback={
              <button
                type="button"
                data-mol-id="chat-autofix-pause"
                onClick={() => {
                  ctx.autoFix.dispatchAutoFix({ type: 'pause' })
                }}
                class={cm.cn(
                  cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
                  cm.touchTargetCompact,
                )}
              >
                {t('ide.chat.autoFixPause', undefined, { defaultValue: 'Pause' })}
              </button>
            }
          >
            <button
              type="button"
              data-mol-id="chat-autofix-resume"
              onClick={() => {
                ctx.autoFix.dispatchAutoFix({ type: 'resume' })
              }}
              class={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
              )}
            >
              {t('ide.chat.autoFixResume', undefined, { defaultValue: 'Resume' })}
            </button>
          </Show>
          <button
            type="button"
            data-mol-id="chat-autofix-cancel"
            onClick={() => {
              ctx.autoFix.dispatchAutoFix({ type: 'cancel' })
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
