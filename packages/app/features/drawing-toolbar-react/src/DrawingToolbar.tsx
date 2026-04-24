import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 *
 */
export interface DrawingTool {
  id: string
  label: string
  icon?: ReactNode
}

interface DrawingToolbarProps {
  /** Tools to render. */
  tools: DrawingTool[]
  /** Currently selected tool id. */
  selectedId: string
  /** Called when the user picks a tool. */
  onSelect: (id: string) => void
  /** Optional extra controls (color picker, stroke width). */
  extras?: ReactNode
  /** Layout — default `'horizontal'`. Set `'vertical'` for left-rail toolbars. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}

const DEFAULT_TOOLS: DrawingTool[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'sticky', label: 'Sticky', icon: '🗒' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
]

/**
 * Whiteboard / canvas / annotation tool selector. Defaults to a
 * standard set of tools (select, rectangle, ellipse, arrow, text,
 * sticky, pen, eraser) but apps can pass any list.
 * @param root0
 * @param root0.tools
 * @param root0.selectedId
 * @param root0.onSelect
 * @param root0.extras
 * @param root0.orientation
 * @param root0.className
 */
export function DrawingToolbar({
  tools = DEFAULT_TOOLS,
  selectedId,
  onSelect,
  extras,
  orientation = 'horizontal',
  className,
}: DrawingToolbarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        orientation === 'vertical' ? cm.stack(1 as const) : cm.flex({ align: 'center', gap: 'xs' }),
        className,
      )}
      role="toolbar"
      aria-label={t('drawingToolbar.label', {}, { defaultValue: 'Drawing tools' })}
    >
      {tools.map((tl) => (
        <Button
          key={tl.id}
          variant={tl.id === selectedId ? 'solid' : 'ghost'}
          color={tl.id === selectedId ? 'primary' : undefined}
          size="sm"
          onClick={() => onSelect(tl.id)}
          aria-pressed={tl.id === selectedId}
          aria-label={tl.label}
          title={tl.label}
        >
          {tl.icon ?? tl.label[0]}
        </Button>
      ))}
      {extras}
    </div>
  )
}
