/**
 * iOS-style switch row used for feature toggles (knowledge-base on/off,
 * structured mode, etc.). Includes an optional leading icon tile.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

/** Props for {@link NodeEditorToggle}. */
export interface NodeEditorToggleProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Material-symbols icon for the leading tile (omit for no tile). */
  icon?: string
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel?: string
}

/** Toggle row. */
export function NodeEditorToggle({
  title,
  subtitle,
  icon,
  checked,
  onChange,
  ariaLabel,
}: NodeEditorToggleProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', justify: 'between' }),
        'bg-surface-container rounded-xl border border-primary/20',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
        {icon ? (
          <div className={cm.cn(cm.sp('p', 2), 'bg-primary/10 rounded-lg text-primary')}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>{icon}</span>
          </div>
        ) : null}
        <div>
          <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {title}
          </p>
          {subtitle ? (
            <p className={cm.cn('text-[10px] text-on-surface-variant')}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      {/* Shared accessible switch (role="switch", aria-checked, 40x40 touch
          hit-area, real change event). The ClassMap still keys the
          track/thumb styling off data-state — the shared component applies
          cm.switchBase/cm.switchThumb internally. */}
      <Switch
        size="sm"
        checked={checked}
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        data-mol-id="node-editor-toggle"
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    </div>
  )
}

export default NodeEditorToggle
