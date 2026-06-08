import { Component, type ErrorInfo, type ReactNode } from 'react'

import { t } from '@molecule/app-i18n'
import { error as logError } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Top-level React error boundary that catches render errors, logs them via
 * the bonded `@molecule/app-logger`, and falls back to a minimal recovery
 * surface localized through `@molecule/app-i18n`.
 *
 * Use this directly under your routing root so it covers the whole route tree.
 *
 * @example
 * import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
 *
 * <RootErrorBoundary>
 *   <RouterProvider router={router} />
 * </RootErrorBoundary>
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
    return this.props.children
  }
}
