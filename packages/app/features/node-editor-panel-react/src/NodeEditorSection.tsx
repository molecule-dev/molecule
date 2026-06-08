/**
 * Labeled section inside the properties panel. Label is rendered in the
 * canonical 11px uppercase-tracking-widest style used by the
 * ai-chatbot-builder properties panel.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface NodeEditorSectionProps {
  label: ReactNode
  children?: ReactNode
  /** Optional content rendered on the right side of the label row (value chip, numeric input). */
  trailing?: ReactNode
  /** Stack gap between section header and children (default 3). */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8
}

/** Labeled section. */
export function NodeEditorSection({
  label,
  children,
  trailing,
  gap = 3,
}: NodeEditorSectionProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.stack(gap)}>
      <div className={cm.flex({ justify: 'between', align: 'center' })}>
        <label
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] text-on-surface-variant uppercase tracking-widest',
          )}
        >
          {label}
        </label>
        {trailing ?? null}
      </div>
      {children}
    </div>
  )
}

export default NodeEditorSection
