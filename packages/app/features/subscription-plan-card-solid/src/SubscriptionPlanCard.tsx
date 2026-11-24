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

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
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

  return (
    <Card
      className={props.className}
      style={
        props.recommended ? { outline: '2px solid currentColor', outlineOffset: -2 } : undefined
      }
    >
      <div class={cm.stack(4)}>
        <header class={cm.stack(1)}>
          <ResolveNode node={props.badge}>
            {(badge, hasBadge) => (
              <Show when={hasBadge() || Boolean(props.recommended)}>
                <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {hasBadge()
                    ? badge()
                    : t('plan.recommended', {}, { defaultValue: 'Recommended' })}
                </span>
              </Show>
            )}
          </ResolveNode>
          <h3 class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{props.name}</h3>
          <PresentWhileNode node={props.description}>
            {(description) => <p class={cm.textSize('sm')}>{description()}</p>}
          </PresentWhileNode>
        </header>
        <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
          <span class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>{props.price}</span>
          <PresentWhileNode node={props.interval}>
            {(interval) => <span class={cm.textSize('sm')}>{interval()}</span>}
          </PresentWhileNode>
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
        <ResolveNode node={props.ctaLabel}>
          {(ctaLabel, hasCtaLabel) => {
            // The CTA: an anchor around the button when `ctaHref` is set.
            const cta = (): JSX.Element => {
              const button = (withHandler: boolean): JSX.Element => (
                <Button
                  variant="solid"
                  color={props.recommended ? 'primary' : 'secondary'}
                  onClick={withHandler ? (event) => props.onCta?.(event) : undefined}
                >
                  {ctaLabel()}
                </Button>
              )
              return props.ctaHref ? <a href={props.ctaHref}>{button(false)}</a> : button(true)
            }
            return <Show when={hasCtaLabel()}>{cta()}</Show>
          }}
        </ResolveNode>
      </div>
    </Card>
  )
}
