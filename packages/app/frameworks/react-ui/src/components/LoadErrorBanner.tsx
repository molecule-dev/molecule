/**
 * LoadErrorBanner component — the shared "load failed" banner with Retry.
 *
 * The fleet hand-rolled this in dozens of apps (an error line + a Retry
 * button, each drifting in wording, styling, and pending behavior). Use it
 * wherever a page/section fetch FAILS — it pairs with `Skeleton` for the
 * loading state and `EmptyState` for the empty one. For form-submit errors
 * use `<Alert status="error">` instead; this banner is specifically the
 * load-failure-with-retry pattern, and its Retry button owns the
 * pending/disabled state so the caller cannot double-fire it.
 *
 * @example
 * ```tsx
 * import { LoadErrorBanner } from '@molecule/app-ui-react'
 *
 * {error ? (
 *   <LoadErrorBanner
 *     message={t('decks.loadFailed', {}, { defaultValue: 'Could not load decks.' })}
 *     onRetry={load} // return the promise — pending state is automatic
 *   />
 * ) : (
 *   <DeckList decks={decks} />
 * )}
 * ```
 *
 * @remarks
 * Pass `onRetry` as a promise-returning function; while it is pending the
 * retry button is disabled and shows a localized "Retrying…" label, and a
 * rejection is NOT swallowed silently — the banner stays (callers render
 * persistent failure by keeping `error` set, which keeps this banner
 * mounted). Omit `onRetry` and no retry button renders (display-only
 * failure). `data-mol-id` on the ROOT goes through rest props (fleet
 * locator convention); the retry button carries `retryMolId`
 * (default `load-error-retry`) so e2e can click it without knowing the
 * page. Announced politely (`role="status"` via the inner Alert's
 * `live={false}`) — a load failure on initial render has nothing to
 * interrupt.
 *
 * @module
 */

import type { JSX } from 'react'
import React, { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Alert } from './Alert.js'
import { Button } from './Button.js'

/** Props for {@link LoadErrorBanner}. */
export interface LoadErrorBannerProps {
  /** The primary error line (e.g. the localized "Could not load X."). */
  message: React.ReactNode
  /** Secondary line under the message (status code, hint). */
  detail?: React.ReactNode
  /**
   * Called when Retry is clicked. Return the promise; while pending, the
   * button is disabled and shows "Retrying…". Omit for a display-only
   * banner.
   */
  onRetry?: () => void | Promise<void>
  /** Retry-button label. Falls back to a localized "Retry". */
  retryLabel?: React.ReactNode
  /** `data-mol-id` for the retry button (default `load-error-retry`). */
  retryMolId?: string
  /** Extra content between message and retry row (e.g. an error code). */
  children?: React.ReactNode
}

/**
 * Error banner with an owned pending-state Retry button.
 *
 * @param props - Component props (see {@link LoadErrorBannerProps}).
 */
export function LoadErrorBanner({
  message,
  detail,
  onRetry,
  retryLabel,
  retryMolId = 'load-error-retry',
  children,
  ...rest
}: LoadErrorBannerProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)

  const handleRetry = (): void => {
    if (!onRetry || pending) return
    setPending(true)
    void Promise.resolve(onRetry()).finally(() => setPending(false))
  }

  return (
    <div {...rest}>
      <Alert status="error" live={false}>
        <div className={cm.stack(2)}>
          <p className={cm.textSize('sm')}>{message}</p>
          {detail ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{detail}</p>
          ) : null}
          {children}
          {onRetry ? (
            <div className={cm.flex({ justify: 'start' })}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={pending}
                data-mol-id={retryMolId}
              >
                {pending
                  ? t('loadError.retrying', {}, { defaultValue: 'Retrying…' })
                  : (retryLabel ?? t('loadError.retry', {}, { defaultValue: 'Retry' }))}
              </Button>
            </div>
          ) : null}
        </div>
      </Alert>
    </div>
  )
}
