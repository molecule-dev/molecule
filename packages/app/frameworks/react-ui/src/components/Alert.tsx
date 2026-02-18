/**
 * Alert component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { t } from '@molecule/app-i18n'
import type { AlertProps, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

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
const statusIconMap: Record<string, string> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Alert component.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      children,
      title,
      status = 'info',
      variant: _variant,
      dismissible,
      onDismiss,
      icon,
      dismissLabel,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const cm = getClassMap()
    const alertVariant = statusVariantMap[status] || 'default'
    const iconName = statusIconMap[alertVariant]
    const defaultIcon = iconName ? renderIcon(iconName, cm.iconMd) : null

    const alertClasses = cm.cn(cm.alert({ variant: alertVariant }), className)

    return (
      <div ref={ref} role="alert" className={alertClasses} style={style} data-testid={testId}>
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
            aria-label={dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })}
          >
            {renderIcon('x-mark', cm.iconSm)}
          </button>
        )}
      </div>
    )
  },
)

Alert.displayName = 'Alert'
