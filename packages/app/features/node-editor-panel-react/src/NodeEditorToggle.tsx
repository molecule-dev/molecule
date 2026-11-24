/**
 * iOS-style switch row used for feature toggles (knowledge-base on/off,
 * structured mode, etc.). Includes an optional leading icon tile.
 *
 * @module
 */

import { type JSX, type ReactNode, useId } from 'react'

import { slot } from '@molecule/app-react/render'
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
  subtitle: subtitleProp,
  icon,
  checked,
  onChange,
  ariaLabel,
}: NodeEditorToggleProps): JSX.Element {
  const subtitle = slot(subtitleProp)
  const cm = getClassMap()
  // The switch is named by the title, and described by the subtitle when one
  // renders — the same text a sighted user reads beside the switch. Both ids
  // come from `useId()` and are consumed unconditionally, so every render
  // keeps the same id assignment.
  const titleId = useId()
  const subtitleId = useId()
  const hasSubtitle = !!subtitle
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', justify: 'between' }),
        cm.nodeEditorPanelToggleRow,
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.nodeEditorPanelToggleGroup)}>
        {icon ? (
          <div className={cm.cn(cm.sp('p', 2), cm.nodeEditorPanelToggleIconTile)}>
            <span className={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>{icon}</span>
          </div>
        ) : null}
        <div>
          <p
            id={titleId}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.nodeEditorPanelToggleTitle,
            )}
          >
            {title}
          </p>
          {hasSubtitle ? (
            <p id={subtitleId} className={cm.cn(cm.nodeEditorPanelToggleSubtitle)}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {/* Shared accessible switch (role="switch", aria-checked, 40x40 touch
          hit-area, real change event). The ClassMap still keys the
          track/thumb styling off data-state — the shared component applies
          cm.switchBase/cm.switchThumb internally. An explicit `ariaLabel`
          overrides the visible title as the switch's name; otherwise the
          title names it. */}
      <Switch
        size="sm"
        checked={checked}
        {...(ariaLabel !== undefined
          ? { 'aria-label': ariaLabel }
          : { 'aria-labelledby': titleId })}
        aria-describedby={hasSubtitle ? subtitleId : undefined}
        data-mol-id="node-editor-toggle"
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    </div>
  )
}

export default NodeEditorToggle
