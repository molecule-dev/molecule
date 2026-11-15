/**
 * Vue feature-flag list row: name + type badge + key + description on the
 * left, one labelled `<Switch>` per environment (with a rollout-% readout for
 * percentage flags) on the right.
 *
 * Vue counterpart of `@molecule/app-feature-flag-row-react`'s `FeatureFlagRow`
 * — the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, toRaw, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { FeatureFlag, FeatureFlagRowProps, FlagType } from './types.js'

/**
 * Human-readable English fallback label for each flag type. Used as the
 * `defaultValue` for the `t('flagType.<type>')` badge, exactly as React does.
 */
const FLAG_TYPE_LABELS: Record<FlagType, string> = {
  boolean: 'Boolean',
  multivariate: 'Multivariate',
  percentage: 'Percentage',
  string: 'String',
}

/**
 * Normalizes a node-valued prop to a child list: an array stays as it is, a
 * single node becomes a one-item list, and the values React renders as nothing
 * (`null`, `undefined`, `false`) contribute nothing.
 *
 * The value is unwrapped with `toRaw` first: a node carried inside a data prop
 * may sit in a reactive object (Vue deep-proxies props an app keeps reactive),
 * and rendering a proxied VNode both tracks its properties in the render effect
 * and writes them back while the VNode mounts — a reactive loop. Vue keeps
 * VNodes out of reactivity (its own `markRaw` guidance), so render the
 * underlying node.
 *
 * @param value - The node-valued prop.
 * @returns The children to render.
 */
const childList = (value: VNodeChild | null | undefined): VNodeChild[] => {
  const raw = toRaw(value)
  if (raw === null || raw === undefined || raw === false) return []
  return Array.isArray(raw) ? raw : [raw]
}

/**
 * Feature-flag list row with per-environment toggle + rollout-percentage
 * display. Use inside a grid or table to build a flags dashboard.
 *
 * @param props - Component props (see {@link FeatureFlagRowProps}).
 * @returns The feature-flag row component.
 */
export const FeatureFlagRow = defineComponent({
  name: 'FeatureFlagRow',
  props: {
    flag: {
      type: Object as PropType<FeatureFlag>,
      required: true,
    },
    onToggle: {
      type: Function as PropType<FeatureFlagRowProps['onToggle']>,
      required: true,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
            cm.sp('py', 2),
            props.className,
          ),
        },
        [
          h('div', { class: cm.cn(cm.flex1, cm.stack(0 as const)) }, [
            h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
              h('span', { class: cm.cn(cm.fontWeight('semibold')) }, childList(props.flag.name)),
              h(
                'span',
                { class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium')) },
                t(
                  `flagType.${props.flag.type}`,
                  {},
                  {
                    defaultValue: FLAG_TYPE_LABELS[props.flag.type],
                  },
                ),
              ),
            ]),
            h('span', { class: cm.cn(cm.textSize('xs')) }, props.flag.key),
            props.flag.description
              ? h('p', { class: cm.textSize('sm') }, childList(props.flag.description))
              : null,
          ]),
          h(
            'div',
            { class: cm.flex({ align: 'center', gap: 'md' }) },
            props.flag.environments.map((env) =>
              h(
                'div',
                {
                  key: env.id,
                  class: cm.cn(cm.stack(0 as const), cm.textCenter),
                },
                [
                  h(
                    'span',
                    { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                    childList(env.label),
                  ),
                  h('div', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
                    h(Switch, {
                      checked: env.enabled,
                      onChange: (event: Event) => {
                        props.onToggle(
                          props.flag.key,
                          env.id,
                          (event.target as HTMLInputElement).checked,
                        )
                      },
                      'aria-label': `${props.flag.key} in ${env.id}`,
                    }),
                    props.flag.type === 'percentage' && env.rolloutPct !== undefined
                      ? h('span', { class: cm.textSize('xs') }, `${env.rolloutPct}%`)
                      : null,
                  ]),
                ],
              ),
            ),
          ),
        ],
      )
  },
})
