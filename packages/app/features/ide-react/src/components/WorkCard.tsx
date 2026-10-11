import type { JSX, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { useThemeMode } from '@molecule/app-react'

import { WorkTrayContext } from './DockStrip.js'

/**
 * The work tray: one full-width row of chips — plan, background tasks, tests,
 * uncommitted files — that sits UNDER the composer's rounded top edge like a
 * layer behind it. Each section is a `DockStrip` that draws its chip into the
 * row and, when its chip is open, its detail below it; one section is open at a
 * time. The tray has a top, left and right border and no bottom edge: the
 * composer is drawn over its lower 8px.
 * @param props - Component props.
 * @param props.children - The sections (strips).
 * @returns The tray.
 */
export function WorkCard({ children }: { children: ReactNode }): JSX.Element {
  const isLight = useThemeMode() === 'light'
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null)
  const [detailEl, setDetailEl] = useState<HTMLElement | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const value = useMemo(
    () => ({
      headerEl,
      detailEl,
      openId,
      toggle: (id: string) => setOpenId((current) => (current === id ? null : id)),
    }),
    [headerEl, detailEl, openId],
  )
  const border = isLight ? '#d0d7de' : '#3d444d'
  return (
    <WorkTrayContext.Provider value={value}>
      <div
        data-mol-id="work-card"
        style={{
          flexShrink: 0,
          position: 'relative',
          boxSizing: 'border-box',
          // Tucked 8px under the composer, which is drawn on top of it.
          marginBottom: -8,
          paddingBottom: 8,
          borderRadius: '8px 8px 0 0',
          border: `1px solid ${border}`,
          borderBottom: 'none',
          background: isLight ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
        }}
      >
        <div
          ref={setHeaderEl}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
          }}
        />
        <div ref={setDetailEl} style={{ maxHeight: 220, overflowY: 'auto' }} />
        {children}
      </div>
    </WorkTrayContext.Provider>
  )
}
