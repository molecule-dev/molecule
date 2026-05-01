import type { CSSProperties } from 'react'

import { useTranslation } from '@molecule/app-react'
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

/**
 * Multi-stage horizontal progress timeline with a current-stage marker.
 * Each stage renders as a labeled circle on a connecting rail; completed
 * stages fill in, the current stage gets a highlighted ring, and upcoming
 * stages stay outlined.
 *
 * Designed for employee-onboarding, applicant-tracking, kanban-board
 * status flows, and order-fulfillment progress trackers.
 *
 * @param props - Component props.
 * @returns The rendered timeline.
 *
 * @example
 * ```tsx
 * <StageTimeline
 *   currentIndex={2}
 *   stages={[
 *     { id: 'applied', label: 'Applied' },
 *     { id: 'screen',  label: 'Phone Screen' },
 *     { id: 'onsite',  label: 'On-site' },
 *     { id: 'offer',   label: 'Offer' },
 *   ]}
 * />
 * ```
 */
export function StageTimeline({ stages, currentIndex, dataMolId, className }: StageTimelineProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (stages.length === 0) {
    return (
      <div
        className={cm.cn(className)}
        role="list"
        aria-label={t('stageTimeline.group', {}, { defaultValue: 'Stage timeline' })}
        data-mol-id={dataMolId ?? 'stage-timeline'}
      />
    )
  }

  // Total fill ratio: how full the connector rail should be (0–1).
  const denom = Math.max(1, stages.length - 1)
  const fillRatio = Math.max(0, Math.min(1, currentIndex / denom))

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
    alignItems: 'start',
  }

  // Connector rail track + filled portion behind the dots.
  const railContainerStyle: CSSProperties = {
    position: 'absolute',
    top: 14, // line up with dot center (dot is 28 ⇒ radius 14)
    left: `${(0.5 / stages.length) * 100}%`,
    right: `${(0.5 / stages.length) * 100}%`,
    height: 2,
    pointerEvents: 'none',
  }

  return (
    <div
      className={cm.cn(className)}
      role="list"
      aria-label={t('stageTimeline.group', {}, { defaultValue: 'Stage timeline' })}
      data-mol-id={dataMolId ?? 'stage-timeline'}
      style={wrapperStyle}
    >
      <div aria-hidden style={railContainerStyle} data-mol-id="stage-timeline-rail">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--mol-color-surface-variant, rgba(0,0,0,0.12))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${fillRatio * 100}%`,
            background: 'var(--mol-color-primary, #3366ff)',
            transition: 'width 200ms ease',
          }}
          data-mol-id="stage-timeline-rail-fill"
        />
      </div>

      {stages.map((stage, i) => (
        <StageDot
          key={stage.id}
          stage={stage}
          status={statusOf(i, currentIndex)}
          index={i}
          total={stages.length}
          t={t}
        />
      ))}
    </div>
  )
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

interface StageDotProps {
  stage: StageTimelineStage
  status: StageStatus
  index: number
  total: number
  t: TranslateFn
}

/**
 * Render one stage marker.
 *
 * @param props - Internal sub-props.
 * @returns The rendered stage marker + label.
 */
function StageDot({ stage, status, index, total, t }: StageDotProps) {
  const cm = getClassMap()
  const dotSize = 28
  const isCompleted = status === 'completed'
  const isCurrent = status === 'current'

  const dotStyle: CSSProperties = {
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    border: `2px solid ${
      isCompleted || isCurrent
        ? 'var(--mol-color-primary, #3366ff)'
        : 'var(--mol-color-outline, rgba(0,0,0,0.25))'
    }`,
    background: isCompleted
      ? 'var(--mol-color-primary, #3366ff)'
      : isCurrent
        ? 'var(--mol-color-primary-container, rgba(51,102,255,0.18))'
        : 'var(--mol-color-surface, transparent)',
    color: isCompleted ? 'var(--mol-color-on-primary, #fff)' : 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    cursor: stage.onClick ? 'pointer' : 'default',
    boxShadow: isCurrent
      ? '0 0 0 4px var(--mol-color-primary-container, rgba(51,102,255,0.18))'
      : undefined,
    transition: 'box-shadow 200ms ease, background 200ms ease',
  }

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  }

  const ariaLabel = t(
    'stageTimeline.stage',
    {
      label: typeof stage.label === 'string' ? stage.label : '',
      index: index + 1,
      total,
      status,
    },
    { defaultValue: 'Stage {{index}} of {{total}}: {{label}} ({{status}})' },
  )

  return (
    <div
      role="listitem"
      data-stage-id={stage.id}
      data-stage-status={status}
      data-mol-id="stage-timeline-stage"
      aria-current={isCurrent ? 'step' : undefined}
      aria-label={ariaLabel}
      style={wrapperStyle}
    >
      <button
        type="button"
        onClick={stage.onClick}
        disabled={!stage.onClick}
        aria-label={ariaLabel}
        data-mol-id="stage-timeline-dot"
        style={{
          ...dotStyle,
          background: dotStyle.background,
          padding: 0,
        }}
      >
        {isCompleted ? '✓' : index + 1}
      </button>
      <span
        className={cm.cn(cm.textSize('xs'), cm.fontWeight(isCurrent ? 'semibold' : 'normal'))}
        data-mol-id="stage-timeline-label"
        style={{
          textAlign: 'center',
          color: isCurrent
            ? 'var(--mol-color-primary, #3366ff)'
            : isCompleted
              ? 'var(--mol-color-on-surface, inherit)'
              : 'var(--mol-color-on-surface-variant, #666)',
        }}
      >
        {stage.label}
      </span>
      {stage.subtitle && (
        <span
          className={cm.textSize('xs')}
          data-mol-id="stage-timeline-subtitle"
          style={{
            textAlign: 'center',
            color: 'var(--mol-color-on-surface-variant, #888)',
          }}
        >
          {stage.subtitle}
        </span>
      )}
    </div>
  )
}
