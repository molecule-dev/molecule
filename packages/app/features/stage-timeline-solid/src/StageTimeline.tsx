/**
 * Solid multi-stage horizontal progress timeline with a current-stage marker.
 *
 * Solid counterpart of `@molecule/app-stage-timeline-react`'s `StageTimeline` —
 * the same props (React names), the same ClassMap tokens, the same inline
 * styles, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { StageStatus, StageTimelineProps, StageTimelineStage } from './types.js'

/**
 * Resolve a stage's rendering status given its index and the current index.
 *
 * @param i - Zero-based stage index.
 * @param currentIndex - Index of the current stage (`-1` = none, `len` = all done).
 * @returns The rendering status for stage `i`.
 */
export function statusOf(i: number, currentIndex: number): StageStatus {
  if (i < currentIndex) return 'completed'
  if (i === currentIndex) return 'current'
  return 'upcoming'
}

/** Props accepted by the internal stage marker. */
interface StageDotProps {
  /** The stage the marker shows. */
  stage: StageTimelineStage
  /** Its current position. */
  index: number
  /** The number of stages. */
  total: number
  /** The current stage's index. */
  currentIndex: number
}

/**
 * One stage marker + its label, as React's internal `StageDot` renders it.
 *
 * @param props - The stage, its index and the timeline's current index.
 * @returns The rendered stage marker.
 */
const StageDot: Component<StageDotProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const status = (): StageStatus => statusOf(props.index, props.currentIndex)
  const isCompleted = (): boolean => status() === 'completed'
  const isCurrent = (): boolean => status() === 'current'

  /** The stage's accessible label, built from React's i18n key and default message. */
  const ariaLabel = (): string =>
    t(
      'stageTimeline.stage',
      {
        label: typeof props.stage.label === 'string' ? props.stage.label : '',
        index: props.index + 1,
        total: props.total,
        status: status(),
      },
      { defaultValue: 'Stage {{index}} of {{total}}: {{label}} ({{status}})' },
    )

  /** The dot's inline style; the connector geometry has no ClassMap resolver. */
  const dotStyle = (): JSX.CSSProperties => {
    const completed = isCompleted()
    const current = isCurrent()
    return {
      width: '28px',
      height: '28px',
      'border-radius': '50%',
      border: `2px solid ${
        completed || current
          ? 'var(--mol-color-primary, #3366ff)'
          : 'var(--mol-color-outline, rgba(0,0,0,0.25))'
      }`,
      background: completed
        ? 'var(--mol-color-primary, #3366ff)'
        : current
          ? 'var(--mol-color-primary-container, rgba(51,102,255,0.18))'
          : 'var(--mol-color-surface, transparent)',
      color: completed ? 'var(--mol-color-on-primary, #fff)' : 'inherit',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'font-size': '14px',
      'font-weight': '700',
      cursor: props.stage.onClick ? 'pointer' : 'default',
      ...(current
        ? { 'box-shadow': '0 0 0 4px var(--mol-color-primary-container, rgba(51,102,255,0.18))' }
        : {}),
      transition: 'box-shadow 200ms ease, background 200ms ease',
      // React merges `{ ...dotStyle, padding: 0 }` onto the button.
      padding: '0px',
    }
  }

  /** The wrapper column's inline style. */
  const wrapperStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    'z-index': '1',
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    gap: '6px',
    'min-width': '0px',
  })

  return (
    <div
      role="listitem"
      data-stage-id={props.stage.id}
      data-stage-status={status()}
      data-mol-id="stage-timeline-stage"
      aria-current={isCurrent() ? 'step' : undefined}
      aria-label={ariaLabel()}
      style={wrapperStyle()}
    >
      <button
        type="button"
        onClick={props.stage.onClick}
        disabled={!props.stage.onClick}
        aria-label={ariaLabel()}
        data-mol-id="stage-timeline-dot"
        style={dotStyle()}
      >
        {isCompleted() ? '✓' : props.index + 1}
      </button>
      <span
        class={cm.cn(cm.textSize('xs'), cm.fontWeight(isCurrent() ? 'semibold' : 'normal'))}
        data-mol-id="stage-timeline-label"
        style={{
          'text-align': 'center',
          color: isCurrent()
            ? 'var(--mol-color-primary, #3366ff)'
            : isCompleted()
              ? 'var(--mol-color-on-surface, inherit)'
              : 'var(--mol-color-on-surface-variant, #666)',
        }}
      >
        {props.stage.label}
      </span>
      {props.stage.subtitle ? (
        <span
          class={cm.textSize('xs')}
          data-mol-id="stage-timeline-subtitle"
          style={{
            'text-align': 'center',
            color: 'var(--mol-color-on-surface-variant, #888)',
          }}
        >
          {props.stage.subtitle}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Multi-stage horizontal progress timeline with a current-stage marker.
 * Each stage renders as a labeled circle on a connecting rail; completed
 * stages fill in, the current stage gets a highlighted ring, and upcoming
 * stages stay outlined.
 *
 * React keys each stage by its `id`, so a re-passed or re-ordered stage list
 * keeps the rendered markers per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the stage's content reads the CURRENT stage for that
 * id reactively.
 *
 * @param props - Component props (see {@link StageTimelineProps}).
 * @returns The rendered timeline.
 */
export const StageTimeline: Component<StageTimelineProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** One stable record per stage id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.stages.map((stage) => {
      seen.add(stage.id)
      let row = records.get(stage.id)
      if (!row) {
        row = { id: stage.id }
        records.set(stage.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const stageFor = (id: string): StageTimelineStage =>
    props.stages.find((stage) => stage.id === id) as StageTimelineStage

  /** The wrapper's inline style — the rail geometry has no ClassMap resolver. */
  const wrapperStyle = (): JSX.CSSProperties => ({
    position: 'relative',
    display: 'grid',
    'grid-template-columns': `repeat(${props.stages.length}, minmax(0, 1fr))`,
    'align-items': 'start',
  })

  /** The connector rail's inline style (hidden behind the dots). */
  const railStyle = (): JSX.CSSProperties => ({
    position: 'absolute',
    top: '14px', // line up with dot center (dot is 28 ⇒ radius 14)
    left: `${(0.5 / props.stages.length) * 100}%`,
    right: `${(0.5 / props.stages.length) * 100}%`,
    height: '2px',
    'pointer-events': 'none',
  })

  return (
    <div
      class={cm.cn(props.className)}
      role="list"
      aria-label={t('stageTimeline.group', {}, { defaultValue: 'Stage timeline' })}
      data-mol-id={props.dataMolId ?? 'stage-timeline'}
      style={props.stages.length === 0 ? undefined : wrapperStyle()}
    >
      {props.stages.length === 0 ? null : (
        <>
          <div aria-hidden="true" style={railStyle()} data-mol-id="stage-timeline-rail">
            <div
              style={{
                position: 'absolute',
                inset: '0px',
                background: 'var(--mol-color-surface-variant, rgba(0,0,0,0.12))',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '0px',
                bottom: '0px',
                left: '0px',
                width: `${
                  Math.max(
                    0,
                    Math.min(1, props.currentIndex / Math.max(1, props.stages.length - 1)),
                  ) * 100
                }%`,
                background: 'var(--mol-color-primary, #3366ff)',
                transition: 'width 200ms ease',
              }}
              data-mol-id="stage-timeline-rail-fill"
            />
          </div>
          <For each={keyedRows()}>
            {(row, index) => (
              <StageDot
                stage={stageFor(row.id)}
                index={index()}
                total={props.stages.length}
                currentIndex={props.currentIndex}
              />
            )}
          </For>
        </>
      )}
    </div>
  )
}
