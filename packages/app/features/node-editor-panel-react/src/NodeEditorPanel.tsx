/**
 * Right-side aside container: title row with close button, scrollable
 * body, sticky footer for save bar + status messages.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, GlyphIcon, Pressable, ScrollArea, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link NodeEditorPanel}. */
export interface NodeEditorPanelProps {
  title: ReactNode
  children?: ReactNode
  /** Footer slot — typically the save bar + status row. */
  footer?: ReactNode
  /** Click handler for the close button (omitted if `onClose` is null). */
  onClose?: () => void
  /** Accessible label of the close button (default: the translated `nodeEditorPanel.close` key). */
  closeAriaLabel?: string
  /** Tailwind width class fragment; defaults to `w-80` (20rem). */
  widthClass?: string
}

/** Properties panel chrome. */
export function NodeEditorPanel({
  title,
  children,
  footer: footerProp,
  onClose,
  closeAriaLabel,
  widthClass,
}: NodeEditorPanelProps): JSX.Element {
  const footer = slot(footerProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Box
      as="aside"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        widthClass ? widthClass : cm.w(80),
        cm.nodeEditorPanelAside,
      )}
    >
      <Box
        as="div"
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.nodeEditorPanelHeader,
        )}
      >
        <Text as="h2" className={cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelTitle)}>
          {title}
        </Text>
        {onClose ? (
          <Pressable
            as="button"
            type="button"
            data-mol-id="node-editor-panel-close"
            // Icon-only chrome: the design system's dialog-close token carries
            // the muted → foreground hover, and the 44px floor makes it
            // tappable without changing how it looks on a pointer device.
            className={cm.cn(cm.dialogClose, cm.touchTarget)}
            aria-label={
              closeAriaLabel ?? t('nodeEditorPanel.close', {}, { defaultValue: 'Close panel' })
            }
            onClick={onClose}
          >
            <GlyphIcon name="close" />
          </Pressable>
        ) : null}
      </Box>
      <ScrollArea
        as="div"
        direction="vertical"
        className={cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(8), cm.nodeEditorPanelBody)}
      >
        {children}
      </ScrollArea>
      {footer ? (
        <Box as="div" className={cm.cn(cm.sp('p', 6), cm.nodeEditorPanelFooter)}>
          {footer}
        </Box>
      ) : null}
    </Box>
  )
}

export default NodeEditorPanel
