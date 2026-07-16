import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

/** Discriminant for the kind of feature flag (boolean, multivariate, percentage rollout, or string variant). */
export type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'string'

/** Per-environment state for a feature flag, including enabled status and optional rollout percentage. */
export interface FeatureFlagEnvironment {
  /** Environment id (e.g. "production", "staging"). */
  id: string
  /** Display label. */
  label: ReactNode
  /** Enabled in this env. */
  enabled: boolean
  /** Rollout percentage 0-100. Optional — render when `type='percentage'`. */
  rolloutPct?: number
}

/** Complete definition of a feature flag including its key, display name, type, and per-environment configuration. */
export interface FeatureFlag {
  key: string
  name: ReactNode
  description?: ReactNode
  type: FlagType
  environments: FeatureFlagEnvironment[]
}

export interface FeatureFlagRowProps {
  flag: FeatureFlag
  /** Called when an environment toggles. */
  onToggle: (flagKey: string, envId: string, next: boolean) => void
  /** Extra classes. */
  className?: string
}

/**
 * Feature-flag list row with per-environment toggle + rollout-percentage
 * display. Use inside a grid or table to build a flags dashboard.
 * @param props - Component props (see {@link FeatureFlagRowProps}).
 */
export function FeatureFlagRow({ flag, onToggle, className }: FeatureFlagRowProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
        cm.sp('py', 2),
        className,
      )}
    >
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.cn(cm.fontWeight('semibold'))}>{flag.name}</span>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
            {t(`flagType.${flag.type}`, {}, { defaultValue: flag.type })}
          </span>
        </div>
        <span className={cm.cn(cm.textSize('xs'))}>{flag.key}</span>
        {flag.description && <p className={cm.textSize('sm')}>{flag.description}</p>}
      </div>
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        {flag.environments.map((env) => (
          <div key={env.id} className={cm.cn(cm.stack(0 as const), cm.textCenter)}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{env.label}</span>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <Switch
                checked={env.enabled}
                onChange={(e) => onToggle(flag.key, env.id, (e.target as HTMLInputElement).checked)}
                aria-label={`${flag.key} in ${env.id}`}
              />
              {flag.type === 'percentage' && env.rolloutPct !== undefined && (
                <span className={cm.textSize('xs')}>{env.rolloutPct}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
