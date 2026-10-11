import type { JSX, ReactNode } from 'react'

import { useThemeMode } from '@molecule/app-react'

/**
 * The one card, pinned above the composer, that holds everything about the work
 * in flight: the plan, background tasks, tests and uncommitted files. Each is a
 * {@link DockStrip} section; this only draws the frame around them and hides the
 * first section's divider.
 * @param props - Component props.
 * @param props.children - The sections (strips) to stack.
 * @returns The framed card.
 */
export function WorkCard({ children }: { children: ReactNode }): JSX.Element {
  const isLight = useThemeMode() === 'light'
  return (
    <div
      data-mol-id="work-card"
      style={{
        margin: '0 12px 8px',
        flexShrink: 0,
        borderRadius: 8,
        border: `1px solid ${isLight ? '#d0d7de' : '#3d444d'}`,
        background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Sections draw a hairline above themselves; pull the stack up one pixel so
          the first section's line is clipped by the frame. */}
      <div style={{ marginTop: -1 }}>{children}</div>
    </div>
  )
}
