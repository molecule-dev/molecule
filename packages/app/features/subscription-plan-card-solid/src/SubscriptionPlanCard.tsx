/**
 * Solid pricing / subscription plan card: badge + name + description, price +
 * interval, feature checklist and a primary CTA (button or link).
 *
 * Solid counterpart of `@molecule/app-subscription-plan-card-react`'s
 * `SubscriptionPlanCard` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import type { SubscriptionPlanCardProps } from './types.js'

/**
 * Pricing / subscription plan card. Renders header (badge + name +
 * description), price + interval, feature checklist, and a primary
 * CTA (button or link).
 *
 * @param props - Component props (see {@link SubscriptionPlanCardProps}).
 * @returns The rendered subscription plan card.
 */
export const SubscriptionPlanCard: Component<SubscriptionPlanCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** React's `badge ?? t(…)`: an empty badge is a provided (blank) badge. */
  const badgeProvided = (): boolean => props.badge !== undefined && props.badge !== null
  /** React's `(badge || recommended)`. */
  const showBadge = (): boolean => Boolean(props.badge) || Boolean(props.recommended)

  /** The CTA: an anchor around the button when `ctaHref` is set. */
  const cta = (): JSX.Element => {
    const button = (withHandler: boolean): JSX.Element => (
      <Button
        variant="solid"
        color={props.recommended ? 'primary' : 'secondary'}
        onClick={withHandler ? (event: MouseEvent) => props.onCta?.(event) : undefined}
      >
        {props.ctaLabel}
      </Button>
    )
    return props.ctaHref ? <a href={props.ctaHref}>{button(false)}</a> : button(true)
  }

  return (
    <Card
      className={props.className}
      style={
        props.recommended ? { outline: '2px solid currentColor', outlineOffset: -2 } : undefined
      }
    >
      <div class={cm.stack(4)}>
        <header class={cm.stack(1)}>
          <Show when={showBadge()}>
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {badgeProvided()
                ? props.badge
                : t('plan.recommended', {}, { defaultValue: 'Recommended' })}
            </span>
          </Show>
          <h3 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{props.name}</h3>
          <Show when={props.description}>
            <p class={cm.textSize('sm')}>{props.description}</p>
          </Show>
        </header>
        <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
          <span class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>{props.price}</span>
          <Show when={props.interval}>
            <span class={cm.textSize('sm')}>{props.interval}</span>
          </Show>
        </div>
        <ul class={cm.stack(2)}>
          <For each={props.features}>
            {(feature) => (
              <li class={cm.flex({ align: 'start', gap: 'sm' })}>
                <span aria-hidden="true">✓</span>
                <span class={cm.textSize('sm')}>{feature}</span>
              </li>
            )}
          </For>
        </ul>
        <Show when={props.ctaLabel}>{cta()}</Show>
      </div>
    </Card>
  )
}
