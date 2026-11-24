/**
 * Vue integration / connection card: icon + title + description + status label
 * + action button.
 *
 * Vue counterpart of `@molecule/app-integration-card-react`'s
 * `IntegrationCard` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { IntegrationCardProps, IntegrationStatus } from './types.js'

/** Action button configuration (React's `action` prop shape). */
type IntegrationCardAction = NonNullable<IntegrationCardProps['action']>

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * prop that was given wins (React's single source of truth — a later `null`
 * removes the node, as React does), and the slot is used only while the prop
 * is absent. An absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const nodeValue = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] =>
  // An empty list renders nothing, as React's slot() treats it.
  toChildArray(prop !== undefined ? prop : slot?.())

/**
 * The status label for one connection state, through `t()` under React's
 * `integrationCard.status.*` keys.
 *
 * @param status - The connection status.
 * @param t - The bonded translation function.
 * @returns The translated label.
 */
const statusLabel = (
  status: IntegrationStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string =>
  status === 'connected'
    ? t('integrationCard.status.connected', {}, { defaultValue: 'Connected' })
    : status === 'pending'
      ? t('integrationCard.status.pending', {}, { defaultValue: 'Connecting…' })
      : status === 'error'
        ? t('integrationCard.status.error', {}, { defaultValue: 'Error' })
        : t('integrationCard.status.disconnected', {}, { defaultValue: 'Not connected' })

/**
 * Card for an integration / external connection (Slack, Stripe, Google
 * Drive, bank-link CTAs, etc.). Shows icon + title + description +
 * status + action.
 *
 * @param props - Component props (see {@link IntegrationCardProps}).
 * @returns The integration card component.
 */
export const IntegrationCard = defineComponent({
  name: 'IntegrationCard',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to omit).
    icon: null,
    title: null,
    description: null,
    status: {
      type: String as PropType<IntegrationStatus>,
      default: 'disconnected',
    },
    action: {
      type: Object as PropType<IntegrationCardAction | null>,
      default: undefined,
    },
    variant: {
      type: String as PropType<'card' | 'cta'>,
      default: 'card',
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The action's label, with React's loading ellipsis on the button branch. */
    const actionLabel = (action: IntegrationCardAction): VNodeChild[] => {
      if (!action.href && action.loading) return ['…']
      return nodeValue(action.label, undefined)
    }

    /** The action node: an anchor around the Button when `href`, the Button otherwise. */
    const actionNode = (): VNodeChild => {
      const action = props.action
      if (!action) return null
      if (action.href) {
        return h('a', { href: action.href }, [
          h(Button, { disabled: Boolean(action.disabled) }, { default: () => actionLabel(action) }),
        ])
      }
      return h(
        Button,
        {
          disabled: Boolean(action.disabled) || Boolean(action.loading),
          onClick: (event: MouseEvent) => action.onClick?.(event),
        },
        { default: () => actionLabel(action) },
      )
    }

    return (): VNode =>
      h(
        Card,
        {
          className: props.className,
          'data-mol-id': props.dataMolId,
          style:
            props.variant === 'cta'
              ? {
                  backgroundImage:
                    'linear-gradient(135deg, var(--color-primary, #4070e0), var(--color-primary-container, #6b8fe8))',
                }
              : undefined,
        },
        {
          default: () => {
            const icon = nodeValue(props.icon, slots.icon)
            const description = nodeValue(props.description, slots.description)
            return [
              h('div', { class: cm.flex({ align: 'start', gap: 'md' }) }, [
                icon.length > 0 ? h('div', { class: cm.shrink0 }, icon) : null,
                h('div', { class: cm.cn(cm.flex1, cm.stack(2)) }, [
                  h(
                    'h3',
                    { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
                    nodeValue(props.title, slots.title),
                  ),
                  description.length > 0 ? h('p', { class: cm.textSize('sm') }, description) : null,
                  h('div', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
                    h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [
                      statusLabel(props.status, t),
                    ]),
                    actionNode(),
                  ]),
                ]),
              ]),
            ]
          },
        },
      )
  },
})
