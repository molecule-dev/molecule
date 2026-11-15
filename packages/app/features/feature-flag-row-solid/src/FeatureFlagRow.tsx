/**
 * Solid feature-flag list row: name + type badge + key + description on the
 * left, one labelled `<Switch>` per environment (with a rollout-% readout for
 * percentage flags) on the right.
 *
 * Solid counterpart of `@molecule/app-feature-flag-row-react`'s
 * `FeatureFlagRow` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, createMemo, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-solid'

import type { FeatureFlagEnvironment, FeatureFlagRowProps, FlagType } from './types.js'

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
 * Feature-flag list row with per-environment toggle + rollout-percentage
 * display. Use inside a grid or table to build a flags dashboard.
 *
 * @param props - Component props (see {@link FeatureFlagRowProps}).
 * @returns The rendered feature-flag row.
 */
export const FeatureFlagRow: Component<FeatureFlagRowProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // React renders the environment rows with `key={env.id}`, so a row's DOM node
  // survives a props update while its id is unchanged (and moves with it) and
  // is re-created only when the id changes. Solid's `<For>` keys by object
  // identity, which would re-create every row when the same environments arrive
  // as equal new objects, so iterate the ids — `<For>` compares strings by value
  // — and read each environment through the latest-by-id lookup.
  const environmentIds = createMemo(() => props.flag.environments.map((env) => env.id))
  const environmentById = createMemo(() => {
    const byId = new Map<string, FeatureFlagEnvironment>()
    for (const env of props.flag.environments) byId.set(env.id, env)
    return byId
  })

  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
        cm.sp('py', 2),
        props.className,
      )}
    >
      <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          <span class={cm.cn(cm.fontWeight('semibold'))}>{props.flag.name}</span>
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
            {t(
              `flagType.${props.flag.type}`,
              {},
              {
                defaultValue: FLAG_TYPE_LABELS[props.flag.type],
              },
            )}
          </span>
        </div>
        <span class={cm.cn(cm.textSize('xs'))}>{props.flag.key}</span>
        <Show when={props.flag.description}>
          <p class={cm.textSize('sm')}>{props.flag.description}</p>
        </Show>
      </div>
      <div class={cm.flex({ align: 'center', gap: 'md' })}>
        <For each={environmentIds()}>
          {(id) => {
            const env = (): FeatureFlagEnvironment => environmentById().get(id)!
            return (
              <div class={cm.cn(cm.stack(0 as const), cm.textCenter)}>
                <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {env().label}
                </span>
                <div class={cm.flex({ align: 'center', gap: 'xs' })}>
                  <Switch
                    checked={env().enabled}
                    onChange={(event: Event) =>
                      props.onToggle(
                        props.flag.key,
                        env().id,
                        (event.target as HTMLInputElement).checked,
                      )
                    }
                    aria-label={`${props.flag.key} in ${env().id}`}
                  />
                  <Show when={props.flag.type === 'percentage' && env().rolloutPct !== undefined}>
                    <span class={cm.textSize('xs')}>{`${env().rolloutPct}%`}</span>
                  </Show>
                </div>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
