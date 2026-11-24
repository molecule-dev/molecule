/**
 * LoadErrorBanner component — the shared "load failed" banner with Retry.
 *
 * Use it wherever a page/section fetch FAILS — it pairs with `Skeleton` for
 * the loading state and `EmptyState` for the empty one. For form-submit errors
 * use `<Alert status="error">` instead; this banner is specifically the
 * load-failure-with-retry pattern, and its Retry button owns the
 * pending/disabled state so the caller cannot double-fire it.
 *
 * @module
 */

import { type Component, createSignal, type JSX, Show, splitProps } from 'solid-js'

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps } from '../utilities/dom.js'
import { Alert } from './Alert.jsx'
import { Button } from './Button.jsx'

/**
 * Props for {@link LoadErrorBanner}. Rest props are forwarded to the root
 * `<div>`, so they are typed as its attributes.
 */
export interface LoadErrorBannerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The primary error line (e.g. the localized "Could not load X."). */
  message: JSX.Element
  /** Secondary line under the message (status code, hint). */
  detail?: JSX.Element
  /**
   * Called when Retry is clicked. Return the promise; while pending, the
   * button is disabled and shows "Retrying…". Omit for a display-only
   * banner.
   */
  onRetry?: () => void | Promise<void>
  /** Retry-button label. Falls back to a localized "Retry". */
  retryLabel?: JSX.Element
  /** `data-mol-id` for the retry button (default `load-error-retry`). */
  retryMolId?: string
  /** Extra content between message and retry row (e.g. an error code). */
  children?: JSX.Element
  /** Extra classes on the root `<div>`. */
  className?: string
  /** Inline styles on the root `<div>`. */
  style?: JSX.CSSProperties
  /** `data-testid` for the root `<div>`. */
  testId?: string
}

/**
 * Error banner with an owned pending-state Retry button.
 *
 * @param props - Component props (see {@link LoadErrorBannerProps}).
 * @returns The rendered error banner.
 */
export const LoadErrorBanner: Component<LoadErrorBannerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'message',
    'detail',
    'onRetry',
    'retryLabel',
    'retryMolId',
    'children',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const [pending, setPending] = createSignal(false)

  /**
   * Runs the retry, owning the pending state around it.
   */
  const handleRetry = (): void => {
    const onRetry = local.onRetry
    if (!onRetry || pending()) return
    setPending(true)
    // A rejected retry means "still failing": the caller owns that error and
    // keeps showing the banner, so ignoring it here only stops it becoming an
    // unhandled rejection.
    void Promise.resolve(onRetry())
      .catch((_error: unknown) => undefined)
      .finally(() => setPending(false))
  }

  return (
    <div
      class={local.className}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      {...reactDomProps(rest)}
    >
      <Alert status="error" live={false}>
        <div class={cm.stack(2)}>
          <p class={cm.textSize('sm')}>{local.message}</p>
          {/* React's `slot(...)`: a `detail` or `retryLabel` that renders nothing is absent (the
              detail hides; the label falls back to the localized "Retry"). */}
          <PresentWhileNode node={local.detail}>
            {(detail) => <p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{detail()}</p>}
          </PresentWhileNode>
          {local.children}
          <Show when={local.onRetry}>
            <div class={cm.flex({ justify: 'start' })}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={pending()}
                data-mol-id={local.retryMolId ?? 'load-error-retry'}
              >
                <Show
                  when={!pending()}
                  fallback={t('loadError.retrying', {}, { defaultValue: 'Retrying…' })}
                >
                  <ResolveNode node={local.retryLabel}>
                    {(label, hasLabel) => (
                      <Show
                        when={hasLabel()}
                        fallback={t('loadError.retry', {}, { defaultValue: 'Retry' })}
                      >
                        {label()}
                      </Show>
                    )}
                  </ResolveNode>
                </Show>
              </Button>
            </div>
          </Show>
        </div>
      </Alert>
    </div>
  )
}
