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
import { Box, GlyphIcon, Text } from '@molecule/app-ui-react/elements'

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
    <Box
      as="div"
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', justify: 'between' }),
        cm.nodeEditorPanelToggleRow,
      )}
    >
      <Box as="div" className={cm.cn(cm.flex({ align: 'center' }), cm.nodeEditorPanelToggleGroup)}>
        {icon ? (
          <Box as="div" className={cm.cn(cm.sp('p', 2), cm.nodeEditorPanelToggleIconTile)}>
            <GlyphIcon name={icon} className={cm.textSize('sm')} />
          </Box>
        ) : null}
        <Box as="div">
          <Text
            as="p"
            id={titleId}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.nodeEditorPanelToggleTitle,
            )}
          >
            {title}
          </Text>
          {hasSubtitle ? (
            <Text as="p" id={subtitleId} className={cm.cn(cm.nodeEditorPanelToggleSubtitle)}>
              {subtitle}
            </Text>
          ) : null}
        </Box>
      </Box>
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
        onChange={({ target }) => {
          if (target && 'checked' in target && typeof target.checked === 'boolean') {
            onChange(target.checked)
          }
        }}
      />
    </Box>
  )
}

export default NodeEditorToggle
