import { Component, type ErrorInfo, type ReactNode } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * The recovery alert the boundary shows once a render error is caught. A function
 * component, so it reads `t` from `useTranslation()` and re-renders in the new
 * language after a locale switch (a class component cannot subscribe to one).
 *
 * @returns The localized recovery alert.
 */
function RootErrorFallback(): ReactNode {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
      )}
      role="alert"
    >
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
        {t('error.unknown', {}, { defaultValue: 'An unexpected error occurred.' })}
      </p>
    </div>
  )
}

/**
 * Top-level React error boundary that catches render errors, logs them via
 * the bonded `@molecule/app-logger`, and falls back to a minimal recovery
 * surface localized through `useTranslation()` from `@molecule/app-react`.
 *
 * Use this directly under your routing root so it covers the whole route tree.
 */
export class RootErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  /**
   * Transitions the component into error state when a render error is caught.
   */
  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  /**
   * Logs the caught render error and its component stack via the bonded logger.
   */
  override componentDidCatch(err: Error, info: ErrorInfo): void {
    logError(err, info.componentStack ?? '')
  }

  /**
   * Renders children normally, or a localized fallback UI when an error has been caught.
   */
  override render(): ReactNode {
    if (this.state.hasError) {
      return <RootErrorFallback />
    }
    return this.props.children
  }
}
