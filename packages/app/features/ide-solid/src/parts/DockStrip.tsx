/**
 * The strips stacked above the composer — working plan, background tasks, tests,
 * uncommitted files — are one family. {@link DockStrip} is their shared chrome
 * (hairline top border, chevron, muted label, right-hand actions, indented
 * detail) and {@link StatusMark} is their shared status icon, so they cannot
 * drift apart.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `DockStrip` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Node-valued props (`icon`, `label`,
 * `hint`, `actions`, `detailActions`, `chipLabel`) are Solid JSX values; the
 * strip's detail is `props.children`. Inside a work tray
 * ({@link WorkTrayContext}) the chip renders where the strip stands (the
 * tray's chip row holds the strips, so the chips keep their order) and, when
 * open, the detail is portalled into the tray's detail element.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'
import {
  createContext,
  createMemo,
  createUniqueId,
  type ParentProps,
  Show,
  useContext,
} from 'solid-js'

import { BodyPortal, rendersNode, resolveNode, useThemeMode } from '@molecule/app-solid'
import { getClassMap, moleculeSpinnerMarkSvg } from '@molecule/app-ui'

/** The pixel size of a strip's status icon at its default. */
const MARK_SIZE = 16

/**
 * The one-row work tray (see WorkCard). When a {@link DockStrip} sits inside
 * it, the strip draws a compact chip where it stands — the tray's chip row holds
 * the strips, so the chips keep the strips' order — and, while it is the open
 * one, its detail into `detailEl`, so every section shares a single row instead
 * of stacking one bar each. The fields are accessors so a tray whose open
 * section changes re-renders every strip in it.
 */
export interface WorkTrayValue {
  /** Where the open section's detail goes. Null until the tray has mounted. */
  detailEl: Accessor<HTMLElement | null>
  /** The open section's `molId`, if any. */
  openId: Accessor<string | null>
  /** Open this section (or close it, when it is already the open one). */
  toggle: (id: string) => void
}

/** Provided by the work tray; absent when a strip stands alone. */
export const WorkTrayContext = createContext<WorkTrayValue | null>(null)

/** Props for {@link StatusMark}. */
export interface StatusMarkProps {
  /** The row's state. */
  state: StatusMarkState
  /** Pixel size (default 16). */
  size?: number
}

/** The states a strip row can be in. */
export type StatusMarkState = 'done' | 'active' | 'todo' | 'failed' | 'waiting' | 'stopped'

/**
 * One status icon for every strip row: the landing page's green check circle
 * when done, the platform's molecule spinner while active, a red crossed circle
 * when failed, an empty ring when still to do.
 *
 * The state branches are `Show` conditions read in JSX, not body-level `if`s —
 * a Solid component's body runs once, and a mark whose state changes after
 * mount (a command that finishes) must re-render the way React's re-render
 * does.
 *
 * @param props - See {@link StatusMarkProps}.
 * @returns The icon.
 */
export function StatusMark(props: StatusMarkProps): JSX.Element {
  const mode = useThemeMode()
  /** Light theme, read at render the way React reads it. */
  const isLight = (): boolean => mode() === 'light'
  const gradientId = `mol-mark-spinner-${createUniqueId()}`
  const size = (): number => props.size ?? MARK_SIZE
  return (
    <Show
      when={props.state === 'active'}
      fallback={
        <Show
          when={props.state === 'todo'}
          fallback={
            <Show
              when={props.state === 'waiting' || props.state === 'stopped'}
              fallback={
                // Settled: a check circle when done, a crossed circle when
                // failed.
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    'flex-shrink': '0',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'box-sizing': 'border-box',
                    width: `${size()}px`,
                    height: `${size()}px`,
                    'border-radius': '50%',
                    border: `1px solid ${props.state === 'failed' ? (isLight() ? '#cf222e' : '#f47067') : isLight() ? '#1e7a00' : '#5bb98c'}`,
                    color:
                      props.state === 'failed'
                        ? isLight()
                          ? '#cf222e'
                          : '#f47067'
                        : isLight()
                          ? '#1e7a00'
                          : '#5bb98c',
                    background:
                      props.state === 'failed'
                        ? isLight()
                          ? 'rgba(207, 34, 46, 0.1)'
                          : 'rgba(244, 112, 103, 0.16)'
                        : isLight()
                          ? 'rgba(30, 122, 0, 0.12)'
                          : 'rgba(91, 185, 140, 0.16)',
                  }}
                >
                  <svg
                    /* Attributes, not CSS: React writes the numbers bare (a `px`
                       suffix would land in the attribute text). */
                    width={`${size() * 0.56}`}
                    height={`${size() * 0.56}`}
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d={
                        props.state === 'failed'
                          ? 'M2.5 2.5 7.5 7.5M7.5 2.5 2.5 7.5'
                          : 'M2 5.2 4 7.2 8 3'
                      }
                    />
                  </svg>
                </span>
              }
            >
              {/* Not running: a still ring that says why — a question mark when
                  the person has to answer, a dash when the work simply stopped. */}
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  'flex-shrink': '0',
                  'align-items': 'center',
                  'justify-content': 'center',
                  'box-sizing': 'border-box',
                  width: `${size()}px`,
                  height: `${size()}px`,
                  'border-radius': '50%',
                  border: `1px solid ${props.state === 'waiting' ? (isLight() ? '#9a6700' : '#e3b341') : isLight() ? '#6e7781' : '#8b949e'}`,
                  color:
                    props.state === 'waiting'
                      ? isLight()
                        ? '#9a6700'
                        : '#e3b341'
                      : isLight()
                        ? '#6e7781'
                        : '#8b949e',
                  'font-size': `${size() * 0.7}px`,
                  'font-weight': '700',
                  'line-height': '1',
                }}
              >
                {props.state === 'waiting' ? '?' : '–'}
              </span>
            </Show>
          }
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              'flex-shrink': '0',
              'box-sizing': 'border-box',
              width: `${size()}px`,
              height: `${size()}px`,
              'border-radius': '50%',
              border: `1.5px solid ${isLight() ? '#afb8c1' : '#6e7681'}`,
            }}
          />
        </Show>
      }
    >
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', 'flex-shrink': '0' }}
        innerHTML={moleculeSpinnerMarkSvg({ size: size(), gradientId })}
      />
    </Show>
  )
}

/** Props for {@link DockStrip} — the React prop names, React's own contract. */
export interface DockStripProps extends ParentProps {
  /** `data-mol-id` of the strip root. */
  molId: string
  /** `data-mol-id` of the header row's overlay disclosure button. */
  toggleMolId?: string
  /** Whether the detail is shown. */
  expanded: boolean
  /** Toggle the detail. */
  onToggle: () => void
  /** Open a full view directly instead of disclosing inline detail. */
  onActivate?: () => void
  /** Leading icon, before the label. */
  icon?: JSX.Element
  /** The strip's one-line summary. */
  label: JSX.Element
  /** Use an icon-only disclosure when the adjacent action already carries the summary. */
  hideLabel?: boolean
  /** A shorter label for the tray chip (defaults to `label`). */
  chipLabel?: JSX.Element
  /** Hover text for the tray chip. */
  chipTitle?: string
  /** Quieter text after the label (the thing in flight). */
  hint?: JSX.Element
  /** Right-hand readout and action buttons; they sit above the disclosure overlay and take their own clicks. */
  actions?: JSX.Element
  /** Secondary actions: at the top of the open detail in the tray, beside `actions` when standalone. */
  detailActions?: JSX.Element
  /** Extra attributes for the root (e.g. a tone `data-*`). */
  rootProps?: Record<string, string>
}

/**
 * Shared chrome for the strips above the composer.
 * @param props - See {@link DockStripProps}.
 * @returns The strip.
 */
export function DockStrip(props: DockStripProps): JSX.Element {
  const cm = getClassMap()
  const tray = useContext(WorkTrayContext)
  // Names the overlay disclosure button through `aria-labelledby`.
  const labelId = createUniqueId()
  const rowClasses = cm.cn(
    cm.button({ variant: 'ghost', color: 'secondary', size: 'xs' }),
    cm.touchTargetCompact,
  )
  const labelClasses = cm.cn(cm.textMuted, cm.textSize('xs'))

  /** The row's accessible name: the label, but only when it is plain text. */
  const rowAriaLabel = (): string | undefined =>
    props.hideLabel && typeof props.label === 'string' ? props.label : undefined

  const onKeyDown =
    (activate: () => void) =>
    (event: KeyboardEvent): void => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        activate()
      }
    }

  if (tray) {
    const open = (): boolean => !props.onActivate && tray.openId() === props.molId
    // Each node prop is resolved once (Solid creates a node each time a prop is read), the
    // detail's only while the section is open, as React mounts it then. A node that renders
    // nothing (an empty list) reads as one not passed, React's `slot(node)`.
    const chipLabel = resolveNode(() => props.chipLabel)
    const detail = resolveNode(() => (open() ? props.children : undefined))
    const detailActions = resolveNode(() => (open() ? props.detailActions : undefined))
    // React's tray branch is the chip, where the strip stands (in the tray's
    // chip row), and a portal of the open detail into the tray's detail
    // element. `<BodyPortal mount={…}>` renders it there without a wrapper
    // element.
    const detailTarget = createMemo(() =>
      open() && (rendersNode(detail()) || rendersNode(detailActions())) ? tray.detailEl() : null,
    )
    return (
      <>
        <div
          data-mol-id={props.molId}
          {...props.rootProps}
          style={{
            display: 'inline-flex',
            'align-items': 'center',
            gap: '6px',
            'max-width': '100%',
          }}
        >
          <div
            role="button"
            tabindex={0}
            data-mol-id={props.toggleMolId}
            aria-expanded={props.onActivate ? undefined : open() ? 'true' : 'false'}
            aria-label={rowAriaLabel()}
            title={props.chipTitle ?? rowAriaLabel()}
            class={rowClasses}
            data-state={open() ? 'open' : 'closed'}
            onClick={() => (props.onActivate ? props.onActivate() : tray.toggle(props.molId))}
            onKeyDown={onKeyDown(() =>
              props.onActivate ? props.onActivate() : tray.toggle(props.molId),
            )}
            /* mol-bespoke-button: a work-tray CHIP — status icon and short label
                   that opens its section's detail; a disclosure toggle, not a CTA. */
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: '6px',
              'min-width': '0px',
              ...(open() ? { 'box-shadow': 'inset 0 0 0 1px currentColor' } : {}),
            }}
          >
            {props.icon}
            {props.hideLabel ? (
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16">
                <path
                  d={open() ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            ) : (
              <span
                class={labelClasses}
                style={{
                  'white-space': 'nowrap',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                }}
              >
                {rendersNode(chipLabel()) ? chipLabel() : props.label}
              </span>
            )}
          </div>
          {props.actions}
        </div>
        <BodyPortal mount={detailTarget()}>
          <div data-mol-id={`${props.molId}-detail`} style={{ padding: '2px 10px 8px' }}>
            {rendersNode(detailActions()) ? (
              <div
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '6px',
                  'margin-bottom': '6px',
                }}
              >
                {detailActions()}
              </div>
            ) : null}
            {detail()}
          </div>
        </BodyPortal>
      </>
    )
  }
  const hint = resolveNode(() => props.hint)
  const actions = resolveNode(() => props.actions)
  const detailActions = resolveNode(() => props.detailActions)
  const detail = resolveNode(() =>
    !props.onActivate && props.expanded ? props.children : undefined,
  )
  return (
    <div
      data-mol-id={props.molId}
      {...props.rootProps}
      style={{ 'border-top': '1px solid rgba(128,128,128,0.15)', padding: '8px 8px 8px 10px' }}
    >
      <div
        /* A container with real controls inside: the disclosure is the
           transparent overlay button below, and the actions paint above it. */
        class={cm.cn(rowClasses, cm.position('relative'))}
        /* mol-bespoke-button: the strip's HEADER ROW — chevron, label and
           actions on one disclosure line. */
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <button
          type="button"
          data-mol-id={props.toggleMolId}
          aria-expanded={props.onActivate ? undefined : props.expanded ? 'true' : 'false'}
          aria-labelledby={props.hideLabel ? undefined : labelId}
          aria-label={props.hideLabel && typeof props.label === 'string' ? props.label : undefined}
          onClick={props.onActivate ?? props.onToggle}
          /* mol-bespoke-button: the whole row is the disclosure's hit area, not
             a CTA — an empty, transparent button over the row; the inline
             background/border/padding are native resets. A `hideLabel` toggle
             whose label is a NODE (not a string) has no text to name it, so
             the node renders inside in a visually hidden wrapper — its text
             names the button without changing the row's pixels. */
          class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          /* Native resets, serialized the way React writes them. */
          style={{ background: 'transparent', border: 'medium', padding: '0px' }}
        >
          <Show when={props.hideLabel && typeof props.label !== 'string'}>
            <span class={cm.srOnly}>{props.label}</span>
          </Show>
        </button>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'min-width': '0px' }}>
          {!props.onActivate && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
              style={{
                transform: props.expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 120ms',
                opacity: '0.5',
                'flex-shrink': '0',
              }}
            >
              <path
                d="M6 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          )}
          {props.icon}
          {!props.hideLabel && (
            <span
              id={labelId}
              class={labelClasses}
              style={{
                'white-space': 'nowrap',
                overflow: 'hidden',
                'text-overflow': 'ellipsis',
              }}
            >
              {props.label}
            </span>
          )}
          {rendersNode(hint()) ? (
            <span
              class={labelClasses}
              style={{
                opacity: '0.75',
                'white-space': 'nowrap',
                overflow: 'hidden',
                'text-overflow': 'ellipsis',
                'min-width': '0px',
              }}
            >
              {hint()}
            </span>
          ) : null}
        </div>
        {rendersNode(actions()) || rendersNode(detailActions()) ? (
          <div
            class={cm.position('relative')}
            style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'flex-shrink': '0' }}
          >
            {actions()}
            {detailActions()}
          </div>
        ) : null}
      </div>
      {rendersNode(detail()) ? (
        <div style={{ 'margin-top': '6px', 'padding-left': '18px' }}>{detail()}</div>
      ) : null}
    </div>
  )
}
