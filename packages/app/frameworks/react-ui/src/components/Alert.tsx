/**
 * Alert component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { AlertProps, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'
import { rootProps } from '../utilities/rootProps.js'

const statusVariantMap: Record<ColorVariant, 'default' | 'info' | 'success' | 'warning' | 'error'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

/**
 * Map alert status to icon name.
 */
const statusIconMap: Record<string, IconName> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Alert component.
 *
 * `role="alert"` is assertive: it interrupts a screen reader immediately,
 * which is correct ONLY for content that appears dynamically (a validation
 * error after submit, a save failure). An Alert rendered statically with
 * the rest of the page (an informational banner already in the initial
 * render) has nothing to interrupt — announcing it assertively on mount is
 * the same over-announcing trap the Toast role fix addresses. `live`
 * (default `true`, matching the previous unconditional behavior so no
 * existing dynamic-error usage silently goes quiet) makes this honest and
 * caller-controlled: pass `live={false}` for a banner that is part of the
 * page's normal content, and it announces politely (`role="status"`)
 * instead of interrupting.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps & { live?: boolean }>(
  (
    {
      children,
      title,
      status = 'info',
      variant,
      live = true,
      dismissible,
      onDismiss,
      icon: iconProp,
      dismissLabel,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const icon = slot(iconProp as React.ReactNode)
    const { t } = useTranslation()
    const cm = getClassMap()
    const alertVariant = statusVariantMap[status] || 'default'
    const iconName = statusIconMap[alertVariant]
    const defaultIcon = iconName ? renderIcon(iconName, cm.iconMd) : null

    const alertClasses = cm.cn(
      cm.alert({ variant: alertVariant }),
      // The core contract types variant="left-accent"; render it as a 4px
      // status-colored leading bar (previously silently dropped).
      variant === 'left-accent' && cm.alertLeftAccent({ variant: alertVariant }),
      className,
    )
    const role = live ? 'alert' : 'status'

    return (
      // Every other declared prop (id, aria-*, data-*, automationId as data-mol-id, the DOM
      // event handlers) reaches the root; a caller's role replaces the live-region default.
      <div
        ref={ref}
        role={role}
        className={alertClasses}
        style={style}
        data-testid={testId}
        {...rootProps(rest)}
      >
        {(icon || defaultIcon) && (
          <span className={cm.alertIconWrapper}>{(icon || defaultIcon) as React.ReactNode}</span>
        )}
        <div className={cm.alertContent}>
          {title && <h5 className={cm.alertTitle}>{title}</h5>}
          <div className={cm.alertDescription}>{children as React.ReactNode}</div>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cm.alertDismiss}
            aria-label={
              dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })
            }
          >
            {renderIcon('x-mark', cm.iconSm)}
          </button>
        )}
      </div>
    )
  },
)

Alert.displayName = 'Alert'
