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

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { FeatureFlag, FeatureFlagRowProps, FlagType } from './types.js'

/**
 * The translation function `useTranslation()` hands back.
 */
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * The translated type-badge label for each flag type: one literal
 * `t('flagType.<type>')` call per value of {@link FlagType}, exactly as React
 * does (a runtime-built key would be invisible to molecule's i18n gate).
 *
 * @param type - The flag type.
 * @param t - The translation function from `useTranslation()`.
 * @returns The badge's label.
 */
function flagTypeLabel(type: FlagType, t: Translate): string {
  switch (type) {
    case 'boolean':
      return t('flagType.boolean', {}, { defaultValue: 'Boolean' })
    case 'multivariate':
      return t('flagType.multivariate', {}, { defaultValue: 'Multivariate' })
    case 'percentage':
      return t('flagType.percentage', {}, { defaultValue: 'Percentage' })
    case 'string':
      return t('flagType.string', {}, { defaultValue: 'String' })
  }
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
              h('span', { class: cm.cn(cm.fontWeight('semibold')) }, toChildArray(props.flag.name)),
              h(
                'span',
                { class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium')) },
                flagTypeLabel(props.flag.type, t),
              ),
            ]),
            h('span', { class: cm.cn(cm.textSize('xs')) }, props.flag.key),
            props.flag.description
              ? h('p', { class: cm.textSize('sm') }, toChildArray(props.flag.description))
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
                    toChildArray(env.label),
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
                      'aria-label': t(
                        'featureFlagRow.aria.flagInEnvironment',
                        { flag: props.flag.key, environment: env.id },
                        { defaultValue: '{{flag}} in {{environment}}' },
                      ),
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
