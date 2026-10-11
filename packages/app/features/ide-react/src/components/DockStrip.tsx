/**
 * The strips stacked above the composer — working plan, background tasks, tests,
 * uncommitted files — are one family. {@link DockStrip} is their shared chrome
 * (hairline top border, chevron, muted label, right-hand actions, indented
 * detail) and {@link StatusMark} is their shared status icon, so they cannot
 * drift apart.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'
import { createContext, useContext, useId } from 'react'
import { createPortal } from 'react-dom'

import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'

const MARK_SIZE = 16

/**
 * The slots of the one-row work tray (see WorkCard). When a {@link DockStrip}
 * sits inside it, the strip draws a compact chip into `headerEl` and, while it
 * is the open one, its detail into `detailEl` — so every section shares a
 * single row instead of stacking one bar each.
 */
export interface WorkTrayValue {
  /** Where the chips go. Null until the tray has mounted. */
  headerEl: HTMLElement | null
  /** Where the open section's detail goes. */
  detailEl: HTMLElement | null
  /** The open section's `molId`, if any. */
  openId: string | null
  /** Open this section (or close it, when it is already the open one). */
  toggle: (id: string) => void
}

/** Provided by the work tray; absent when a strip stands alone. */
export const WorkTrayContext = createContext<WorkTrayValue | null>(null)

/** The states a strip row can be in. */
export type StatusMarkState = 'done' | 'active' | 'todo' | 'failed' | 'waiting' | 'stopped'

/**
 * One status icon for every strip row: the landing page's green check circle
 * when done, the platform's molecule spinner while active, a red crossed circle
 * when failed, an empty ring when still to do.
 * @param props - Component props.
 * @param props.state - The row's state.
 * @param props.size - Pixel size (default 16).
 * @returns The icon.
 */
export function StatusMark({
  state,
  size = MARK_SIZE,
}: {
  state: StatusMarkState
  size?: number
}): JSX.Element {
  const isLight = useThemeMode() === 'light'
  const gradientId = `mol-mark-spinner-${useId().replace(/[:]/g, '')}`
  if (state === 'active') {
    return (
      <span
        aria-hidden
        style={{ display: 'inline-flex', flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: moleculeSpinnerMarkSvg({ size, gradientId }) }}
      />
    )
  }
  if (state === 'todo') {
    return (
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          flexShrink: 0,
          boxSizing: 'border-box',
          width: size,
          height: size,
          borderRadius: '50%',
          border: `1.5px solid ${isLight ? '#afb8c1' : '#6e7681'}`,
        }}
      />
    )
  }
  if (state === 'waiting' || state === 'stopped') {
    // Not running: a still ring that says why — a question mark when the person
    // has to answer, a dash when the work simply stopped.
    const ink =
      state === 'waiting' ? (isLight ? '#9a6700' : '#e3b341') : isLight ? '#6e7781' : '#8b949e'
    return (
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          width: size,
          height: size,
          borderRadius: '50%',
          border: `1px solid ${ink}`,
          color: ink,
          fontSize: size * 0.7,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {state === 'waiting' ? '?' : '–'}
      </span>
    )
  }
  const failed = state === 'failed'
  const ink = failed ? (isLight ? '#cf222e' : '#f47067') : isLight ? '#1e7a00' : '#5bb98c'
  const tint = failed
    ? isLight
      ? 'rgba(207, 34, 46, 0.1)'
      : 'rgba(244, 112, 103, 0.16)'
    : isLight
      ? 'rgba(30, 122, 0, 0.12)'
      : 'rgba(91, 185, 140, 0.16)'
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid ${ink}`,
        color: ink,
        background: tint,
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={failed ? 'M2.5 2.5 7.5 7.5M7.5 2.5 2.5 7.5' : 'M2 5.2 4 7.2 8 3'} />
      </svg>
    </span>
  )
}

/** Props for {@link DockStrip}. */
export interface DockStripProps {
  /** `data-mol-id` of the strip root. */
  molId: string
  /** `data-mol-id` of the clickable header row. */
  toggleMolId?: string
  /** Whether the detail is shown. */
  expanded: boolean
  /** Toggle the detail. */
  onToggle: () => void
  /** Leading icon, before the label. */
  icon?: ReactNode
  /** The strip's one-line summary. */
  label: ReactNode
  /** A shorter label for the tray chip (defaults to `label`). */
  chipLabel?: ReactNode
  /** Hover text for the tray chip. */
  chipTitle?: string
  /** Quieter text after the label (the thing in flight). */
  hint?: ReactNode
  /** Right-hand readout and action buttons; clicks must stop propagation. */
  actions?: ReactNode
  /** Extra attributes for the root (e.g. a tone `data-*`). */
  rootProps?: Record<string, string>
  /** The detail shown when expanded. */
  children?: ReactNode
}

/**
 * Shared chrome for the strips above the composer.
 * @param props - See {@link DockStripProps}.
 * @returns The strip.
 */
export function DockStrip({
  molId,
  toggleMolId,
  expanded,
  onToggle,
  icon,
  label,
  chipLabel,
  chipTitle,
  hint,
  actions,
  rootProps,
  children,
}: DockStripProps): JSX.Element | null {
  const cm = getClassMap()
  const tray = useContext(WorkTrayContext)
  if (tray) {
    if (!tray.headerEl) return null
    const open = tray.openId === molId
    return (
      <>
        {createPortal(
          <div
            data-mol-id={molId}
            {...rootProps}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}
          >
            <div
              role="button"
              tabIndex={0}
              data-mol-id={toggleMolId}
              aria-expanded={open}
              title={chipTitle}
              onClick={() => tray.toggle(molId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  tray.toggle(molId)
                }
              }}
              /* mol-bespoke-button: a work-tray CHIP — status icon and short label that
                 opens its section's detail; a disclosure toggle, not a CTA. */
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
                padding: '2px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: open ? 'rgba(128,128,128,0.18)' : 'rgba(128,128,128,0.08)',
              }}
            >
              {icon}
              <span
                className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {chipLabel ?? label}
              </span>
            </div>
            {actions}
          </div>,
          tray.headerEl,
        )}
        {open && children && tray.detailEl
          ? createPortal(
              <div data-mol-id={`${molId}-detail`} style={{ padding: '2px 10px 8px' }}>
                {children}
              </div>,
              tray.detailEl,
            )
          : null}
      </>
    )
  }
  return (
    <div
      data-mol-id={molId}
      {...rootProps}
      style={{ borderTop: '1px solid rgba(128,128,128,0.15)', padding: '8px 8px 8px 10px' }}
    >
      <div
        role="button"
        tabIndex={0}
        data-mol-id={toggleMolId}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        /* mol-bespoke-button: the strip's HEADER ROW — chevron, label and
           actions on one disclosure line; its real buttons are the actions. */
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms',
              opacity: 0.5,
              flexShrink: 0,
            }}
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {icon}
          <span
            className={cm.cn(cm.textMuted, cm.textSize('xs'))}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {label}
          </span>
          {hint ? (
            <span
              className={cm.cn(cm.textMuted, cm.textSize('xs'))}
              style={{
                opacity: 0.75,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {hint}
            </span>
          ) : null}
        </div>
        {actions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {actions}
          </div>
        ) : null}
      </div>
      {expanded && children ? (
        <div style={{ marginTop: 6, paddingLeft: 18 }}>{children}</div>
      ) : null}
    </div>
  )
}
