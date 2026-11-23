/**
 * The work tray: one full-width row of chips — plan, background tasks, tests,
 * uncommitted files — that sits UNDER the composer's rounded top edge like a
 * layer behind it. The row holds the sections: each is a `DockStrip` that draws
 * its chip where it stands, so the chips keep the order the sections are given
 * in, and, when its chip is open, its detail below the row; one section is open
 * at a time. The tray has a top, left and right border and no bottom edge: the
 * composer is drawn over its lower 8px.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `WorkCard` (see that file
 * for the design notes): the same DOM for the same input, the same tray
 * state. The strips are `props.children`; the tray provides
 * `WorkTrayContext` (its fields are accessors, as the Solid `DockStrip` reads
 * them) and renders the header element (which holds the children) and the
 * detail element inside one bordered frame. The component is a part (React renders it
 * inside ChatPanel without exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createSignal, type ParentProps } from 'solid-js'

import { useThemeMode } from '@molecule/app-solid'

import { WorkTrayContext } from './DockStrip.jsx'

/** Props for {@link WorkCard} — the React prop names, React's own contract. */
export type WorkCardProps = ParentProps

/**
 * Renders the work tray frame.
 * @param props - See {@link WorkCardProps}.
 * @returns The tray.
 */
export function WorkCard(props: WorkCardProps): JSX.Element {
  const mode = useThemeMode()
  const [detailEl, setDetailEl] = createSignal<HTMLElement | null>(null)
  const [openId, setOpenId] = createSignal<string | null>(null)
  const value = {
    detailEl,
    openId,
    toggle: (id: string): void => {
      setOpenId(openId() === id ? null : id)
    },
  }
  // The frame's style, built at render the way React builds its style object:
  // one object through Solid's style diff, so the declarations apply in key
  // order (the shorthand before the border-bottom that folds its bottom side
  // away). A style literal with static keys is folded into the compiled
  // template and re-set AFTER the dynamic ones, which would clobber the
  // border-bottom with the border shorthand.
  const frameStyle = (): JSX.CSSProperties => ({
    'flex-shrink': '0',
    position: 'relative',
    'box-sizing': 'border-box',
    // Tucked 8px under the composer, which is drawn on top of it.
    'margin-bottom': '-8px',
    'padding-bottom': '8px',
    'border-radius': '8px 8px 0 0',
    border: `1px solid ${mode() === 'light' ? '#d0d7de' : '#3d444d'}`,
    'border-bottom': 'none',
    background: mode() === 'light' ? '#f6f8fa' : 'rgba(255,255,255,0.04)',
  })
  return (
    <WorkTrayContext.Provider value={value}>
      <div data-mol-id="work-card" style={frameStyle()}>
        <div
          style={{
            display: 'flex',
            'flex-wrap': 'wrap',
            'align-items': 'center',
            gap: '6px',
            padding: '6px 10px',
          }}
        >
          {props.children}
        </div>
        <div ref={setDetailEl} style={{ 'max-height': '220px', 'overflow-y': 'auto' }} />
      </div>
    </WorkTrayContext.Provider>
  )
}
