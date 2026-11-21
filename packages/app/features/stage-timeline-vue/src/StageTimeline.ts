/**
 * Vue multi-stage horizontal progress timeline with a current-stage marker.
 *
 * Vue counterpart of `@molecule/app-stage-timeline-react`'s `StageTimeline` —
 * the same props (React names), the same ClassMap tokens, the same inline
 * styles, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { StageStatus, StageTimelineStage } from './types.js'

/** The translation function `useTranslation()` provides. */
type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

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
 * Children for an element: an array stays as it is, `null`/`undefined`
 * contribute nothing, anything else becomes one child.
 *
 * @param value - A node-valued field.
 * @returns The element's children.
 */
const childrenOf = (value: VNodeChild): VNodeChild[] =>
  value == null ? [] : Array.isArray(value) ? value : [value]

/**
 * One stage marker's dot style, as Vue's style object. Numbers are written
 * with their unit as strings, because only React's style object adds `px` to a
 * bare number; the serialized style is what every framework must match.
 *
 * @param stage - The stage the dot belongs to.
 * @param status - The stage's rendering status.
 * @returns The dot's inline style.
 */
const dotStyle = (stage: StageTimelineStage, status: StageStatus): Record<string, string> => {
  const isCompleted = status === 'completed'
  const isCurrent = status === 'current'
  const style: Record<string, string> = {
    width: '28px',
    height: '28px',
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
    fontSize: '14px',
    fontWeight: '700',
    cursor: stage.onClick ? 'pointer' : 'default',
    transition: 'box-shadow 200ms ease, background 200ms ease',
    // React merges `{ ...dotStyle, padding: 0 }` onto the button.
    padding: '0px',
  }
  if (isCurrent)
    style.boxShadow = '0 0 0 4px var(--mol-color-primary-container, rgba(51,102,255,0.18))'
  return style
}

/**
 * The status-independent style of a stage's wrapper column.
 *
 * @returns The wrapper's inline style.
 */
const stageWrapperStyle = (): Record<string, string> => ({
  position: 'relative',
  zIndex: '1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  minWidth: '0px',
})

/**
 * The stage's accessible label, built from the same i18n key and default
 * message React uses (only a plain string label is carried into it).
 *
 * @param t - The translation function.
 * @param stage - The stage.
 * @param index - The stage's zero-based index.
 * @param total - The number of stages.
 * @param status - The stage's rendering status.
 * @returns The aria label.
 */
const stageAria = (
  t: TranslateFn,
  stage: StageTimelineStage,
  index: number,
  total: number,
  status: StageStatus,
): string =>
  t(
    'stageTimeline.stage',
    {
      label: typeof stage.label === 'string' ? stage.label : '',
      index: index + 1,
      total,
      status,
    },
    { defaultValue: 'Stage {{index}} of {{total}}: {{label}} ({{status}})' },
  )

/**
 * Multi-stage horizontal progress timeline with a current-stage marker.
 * Each stage renders as a labeled circle on a connecting rail; completed
 * stages fill in, the current stage gets a highlighted ring, and upcoming
 * stages stay outlined.
 *
 * @param props - Component props (see {@link StageTimelineProps}).
 * @returns The timeline component.
 */
export const StageTimeline = defineComponent({
  name: 'StageTimeline',
  props: {
    stages: { type: Array as PropType<StageTimelineStage[]>, required: true },
    currentIndex: { type: Number, required: true },
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * One stage marker + its label, as a Vue vnode.
     *
     * @param stage - The stage.
     * @param index - The stage's zero-based index.
     * @returns The rendered stage marker.
     */
    const stageDot = (stage: StageTimelineStage, index: number): VNode => {
      const status = statusOf(index, props.currentIndex)
      const isCompleted = status === 'completed'
      const isCurrent = status === 'current'
      const ariaLabel = stageAria(t, stage, index, props.stages.length, status)

      return h(
        'div',
        {
          // React keys each stage by `stage.id`; Vue keeps the same nodes only
          // when the vnode carries the same key.
          key: stage.id,
          role: 'listitem',
          'data-stage-id': stage.id,
          'data-stage-status': status,
          'data-mol-id': 'stage-timeline-stage',
          'aria-current': isCurrent ? 'step' : undefined,
          'aria-label': ariaLabel,
          style: stageWrapperStyle(),
        },
        [
          h(
            'button',
            {
              type: 'button',
              onClick: stage.onClick,
              disabled: !stage.onClick,
              'aria-label': ariaLabel,
              'data-mol-id': 'stage-timeline-dot',
              style: dotStyle(stage, status),
            },
            [isCompleted ? '✓' : index + 1],
          ),
          h(
            'span',
            {
              class: cm.cn(cm.textSize('xs'), cm.fontWeight(isCurrent ? 'semibold' : 'normal')),
              'data-mol-id': 'stage-timeline-label',
              style: {
                textAlign: 'center',
                color: isCurrent
                  ? 'var(--mol-color-primary, #3366ff)'
                  : isCompleted
                    ? 'var(--mol-color-on-surface, inherit)'
                    : 'var(--mol-color-on-surface-variant, #666)',
              },
            },
            childrenOf(stage.label),
          ),
          stage.subtitle
            ? h(
                'span',
                {
                  class: cm.textSize('xs'),
                  'data-mol-id': 'stage-timeline-subtitle',
                  style: {
                    textAlign: 'center',
                    color: 'var(--mol-color-on-surface-variant, #888)',
                  },
                },
                childrenOf(stage.subtitle),
              )
            : null,
        ],
      )
    }

    return (): VNode => {
      const attributes: Record<string, unknown> = {
        class: cm.cn(props.className),
        role: 'list',
        'aria-label': t('stageTimeline.group', {}, { defaultValue: 'Stage timeline' }),
        'data-mol-id': props.dataMolId ?? 'stage-timeline',
      }

      if (props.stages.length === 0) return h('div', attributes)

      // Total fill ratio: how full the connector rail should be (0–1).
      const denom = Math.max(1, props.stages.length - 1)
      const fillRatio = Math.max(0, Math.min(1, props.currentIndex / denom))
      const inset = `${(0.5 / props.stages.length) * 100}%`

      attributes.style = {
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${props.stages.length}, minmax(0, 1fr))`,
        alignItems: 'start',
      }

      return h('div', attributes, [
        h(
          'div',
          {
            'aria-hidden': 'true',
            style: {
              position: 'absolute',
              top: '14px', // line up with dot center (dot is 28 ⇒ radius 14)
              left: inset,
              right: inset,
              height: '2px',
              pointerEvents: 'none',
            },
            'data-mol-id': 'stage-timeline-rail',
          },
          [
            h('div', {
              style: {
                position: 'absolute',
                inset: '0px',
                background: 'var(--mol-color-surface-variant, rgba(0,0,0,0.12))',
              },
            }),
            h('div', {
              style: {
                position: 'absolute',
                top: '0px',
                bottom: '0px',
                left: '0px',
                width: `${fillRatio * 100}%`,
                background: 'var(--mol-color-primary, #3366ff)',
                transition: 'width 200ms ease',
              },
              'data-mol-id': 'stage-timeline-rail-fill',
            }),
          ],
        ),
        ...props.stages.map((stage, i) => stageDot(stage, i)),
      ])
    }
  },
})
