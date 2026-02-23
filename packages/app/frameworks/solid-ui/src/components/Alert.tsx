/**
 * Alert component.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { AlertProps, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.jsx'

const statusVariantMap: Record<ColorVariant, 'default' | 'info' | 'success' | 'warning' | 'error'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

const statusIconMap: Record<string, string> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Renders the Alert component.
 * @param props - The component props.
 * @returns The rendered alert JSX.
 */
export const Alert: Component<AlertProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'title',
    'status',
    'variant',
    'dismissible',
    'dismissLabel',
    'onDismiss',
    'icon',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const cmVariant = (): 'default' | 'info' | 'success' | 'warning' | 'error' => statusVariantMap[local.status || 'info'] || 'default'
  const iconName = (): string | undefined => statusIconMap[cmVariant()]

  const alertClasses = (): string => cm.cn(cm.alert({ variant: cmVariant() }), local.className)

  return (
    <div role="alert" class={alertClasses()} style={local.style} data-testid={local.testId}>
      <Show when={local.icon || iconName()}>
        <span class={cm.alertIconWrapper}>
          <Show when={local.icon} fallback={renderIcon(iconName()!, cm.iconMd)}>
            {local.icon as JSX.Element}
          </Show>
        </span>
      </Show>
      <div class={cm.alertContent}>
        <Show when={local.title}>
          <h5 class={cm.alertTitle}>{local.title}</h5>
        </Show>
        <div class={cm.alertDescription}>{local.children as JSX.Element}</div>
      </div>
      <Show when={local.dismissible}>
        <button
          type="button"
          onClick={local.onDismiss}
          class={cm.alertDismiss}
          aria-label={local.dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })}
        >
          {renderIcon('x-mark', cm.iconSm)}
        </button>
      </Show>
    </div>
  )
}
