/**
 * Vue pricing / subscription plan card: badge + name + description, price +
 * interval, feature checklist and a primary CTA (button or link).
 *
 * Vue counterpart of `@molecule/app-subscription-plan-card-react`'s
 * `SubscriptionPlanCard` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing (`null` and `false`
 * render nothing, as React renders them).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (slot: (() => VNodeChild[]) | undefined, prop: VNodeChild): VNodeChild[] => {
  if (slot) return slot()
  return prop !== undefined && prop !== null && prop !== false ? [prop] : []
}

/**
 * Pricing / subscription plan card. Renders header (badge + name +
 * description), price + interval, feature checklist, and a primary
 * CTA (button or link).
 *
 * @param props - Component props (see {@link SubscriptionPlanCardProps}).
 * @returns The subscription plan card component.
 */
export const SubscriptionPlanCard = defineComponent({
  name: 'SubscriptionPlanCard',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to omit).
    name: null,
    description: null,
    price: null,
    interval: null,
    features: {
      type: Array as PropType<VNodeChild[]>,
      required: true,
    },
    ctaLabel: null,
    onCta: Function as PropType<(event?: MouseEvent) => void>,
    ctaHref: String,
    recommended: {
      type: Boolean,
      default: false,
    },
    badge: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const name = slotOrProp(slots.name, props.name)
      const description = slotOrProp(slots.description, props.description)
      const price = slotOrProp(slots.price, props.price)
      const interval = slotOrProp(slots.interval, props.interval)
      const badge = slotOrProp(slots.badge, props.badge)
      const ctaLabel = slotOrProp(slots.ctaLabel, props.ctaLabel)

      // React: `(badge || recommended) && <span>{badge ?? t(…)}</span>`.
      const badgeProvided =
        slots.badge !== undefined || (props.badge !== undefined && props.badge !== null)
      const showBadge =
        slots.badge !== undefined || Boolean(props.badge) || Boolean(props.recommended)
      const badgeText = badgeProvided
        ? badge
        : [t('plan.recommended', {}, { defaultValue: 'Recommended' })]

      // React: `{ctaLabel && cta}` — an empty label hides the CTA.
      const showCta = slots.ctaLabel !== undefined || Boolean(props.ctaLabel)

      const button = (onClick?: (event: MouseEvent) => void): VNode =>
        h(
          Button,
          {
            variant: 'solid',
            color: props.recommended ? 'primary' : 'secondary',
            onClick,
          },
          { default: () => ctaLabel },
        )

      const cta: VNode = props.ctaHref
        ? h('a', { href: props.ctaHref }, [button()])
        : button((event: MouseEvent) => props.onCta?.(event))

      return h(
        Card,
        {
          className: props.className,
          style: props.recommended
            ? { outline: '2px solid currentColor', outlineOffset: '-2px' }
            : undefined,
        },
        {
          default: () => [
            h('div', { class: cm.stack(4) }, [
              h('header', { class: cm.stack(1) }, [
                showBadge
                  ? h(
                      'span',
                      { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                      badgeText,
                    )
                  : null,
                h('h3', { class: cm.cn(cm.textSize('xl'), cm.fontWeight('bold')) }, name),
                slots.description !== undefined || Boolean(props.description)
                  ? h('p', { class: cm.textSize('sm') }, description)
                  : null,
              ]),
              h('div', { class: cm.flex({ align: 'baseline', gap: 'xs' }) }, [
                h('span', { class: cm.cn(cm.textSize('4xl'), cm.fontWeight('bold')) }, price),
                slots.interval !== undefined || Boolean(props.interval)
                  ? h('span', { class: cm.textSize('sm') }, interval)
                  : null,
              ]),
              h(
                'ul',
                { class: cm.stack(2) },
                props.features.map((feature) =>
                  h('li', { class: cm.flex({ align: 'start', gap: 'sm' }) }, [
                    h('span', { 'aria-hidden': 'true' }, '✓'),
                    h('span', { class: cm.textSize('sm') }, [feature]),
                  ]),
                ),
              ),
              showCta ? cta : null,
            ]),
          ],
        },
      )
    }
  },
})
