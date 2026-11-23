<!--
  FeatureFlagRow: the Svelte counterpart of
  `@molecule/app-feature-flag-row-react`'s `FeatureFlagRow` — flag name + type
  badge + key + description on the left, one labelled `<Switch>` per
  environment (with a rollout-% readout for percentage flags) on the right.
  Same props, same DOM for the same input; the node-valued fields are snippets
  (or plain strings).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Switch } from '@molecule/app-ui-svelte'

  import type { FeatureFlagRowProps, FlagType } from './types.js'

  /** The translation function `useTranslation()` hands back. */
  type Translate = ReturnType<typeof useTranslation>['t']

  /**
   * The translated type-badge label for each flag type: one literal
   * `t('flagType.<type>')` call per value of `FlagType`, exactly as React does
   * (a runtime-built key would be invisible to molecule's i18n gate).
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

  let { flag, onToggle, className }: FeatureFlagRowProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
</script>

<div
  class={cm.cn(
    cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
    cm.sp('py', 2),
    className,
  )}
>
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      <span class={cm.cn(cm.fontWeight('semibold'))}>
        {#if typeof flag.name === 'function'}{@render flag.name?.()}{:else}{flag.name}{/if}
      </span>
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
        {flagTypeLabel(flag.type, t)}
      </span>
    </div>
    <span class={cm.cn(cm.textSize('xs'))}>{flag.key}</span>
    {#if flag.description}
      <p class={cm.textSize('sm')}>
        {#if typeof flag.description === 'function'}{@render flag.description?.()}{:else}{flag.description}{/if}
      </p>
    {/if}
  </div>
  <div class={cm.flex({ align: 'center', gap: 'md' })}>
    {#each flag.environments as env (env.id)}
      <div class={cm.cn(cm.stack(0), cm.textCenter)}>
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {#if typeof env.label === 'function'}{@render env.label?.()}{:else}{env.label}{/if}
        </span>
        <div class={cm.flex({ align: 'center', gap: 'xs' })}>
          <Switch
            checked={env.enabled}
            onChange={(event) =>
              onToggle(flag.key, env.id, (event.target as HTMLInputElement).checked)}
            aria-label={t(
              'featureFlagRow.aria.flagInEnvironment',
              { flag: flag.key, environment: env.id },
              { defaultValue: '{{flag}} in {{environment}}' },
            )}
          />
          {#if flag.type === 'percentage' && env.rolloutPct !== undefined}
            <span class={cm.textSize('xs')}>{env.rolloutPct}%</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
