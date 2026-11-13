/**
 * Alert component.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-solid'
import type { AlertProps, ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
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
 * Renders the Alert component.
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
 *
 * @param props - The component props.
 * @returns The rendered alert JSX.
 */
export const Alert: Component<AlertProps & { live?: boolean }> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'title',
    'status',
    'variant',
    'live',
    'dismissible',
    'onDismiss',
    'icon',
    'dismissLabel',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const status = (): NonNullable<AlertProps['status']> => local.status ?? 'info'
  const alertVariant = (): 'default' | 'info' | 'success' | 'warning' | 'error' =>
    statusVariantMap[status()] || 'default'
  const iconName = (): IconName | undefined => statusIconMap[alertVariant()]
  const defaultIcon = (): JSX.Element | null => {
    const name = iconName()
    return name ? renderIcon(name, cm.iconMd) : null
  }

  const alertClasses = (): string =>
    cm.cn(
      cm.alert({ variant: alertVariant() }),
      // The core contract types variant="left-accent"; render it as a 4px
      // status-colored leading bar (previously silently dropped).
      local.variant === 'left-accent' && cm.alertLeftAccent({ variant: alertVariant() }),
      local.className,
    )

  /**
   * Forwards the click to `onDismiss`. The core type declares no parameters,
   * but the reference wires it as the click handler, so it receives the event.
   *
   * @param event - The dismiss button's click event.
   */
  const handleDismiss = (event: MouseEvent): void => {
    const onDismiss = local.onDismiss as ((event: MouseEvent) => void) | undefined
    onDismiss?.(event)
  }

  return (
    <div
      role={(local.live ?? true) ? 'alert' : 'status'}
      class={alertClasses()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
    >
      <Show when={local.icon || defaultIcon()}>
        <span class={cm.alertIconWrapper}>{(local.icon || defaultIcon()) as JSX.Element}</span>
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
          onClick={handleDismiss}
          class={cm.alertDismiss}
          aria-label={
            local.dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })
          }
        >
          {renderIcon('x-mark', cm.iconSm)}
        </button>
      </Show>
    </div>
  )
}
