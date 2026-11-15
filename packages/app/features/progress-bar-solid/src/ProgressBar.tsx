import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ProgressBarProps } from './types.js'

/** The fill percentage React computes: `max === 0 ? 0 : clamp(0, 100, value / max * 100)`. */
const fillPercent = (value: number, max: number): number =>
  max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))

/**
 * Labeled progress bar with optional value display.
 *
 * Renders a `[label ... valueLabel]` header row above a track. The track
 * itself uses the wired ClassMap progress tokens — swap the ClassMap bond
 * to restyle without touching this component.
 *
 * This is the Solid counterpart of `@molecule/app-progress-bar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link ProgressBarProps}).
 * @returns The rendered progress bar.
 */
export const ProgressBar: Component<ProgressBarProps> = (props) => {
  const cm = getClassMap()
  const max = (): number => props.max ?? 100
  const size = (): 'sm' | 'md' | 'lg' => props.size ?? 'md'
  const color = (): 'primary' | 'success' | 'warning' | 'error' | 'info' => props.color ?? 'primary'

  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      {(props.label || props.valueLabel) && (
        <div class={cm.flex({ justify: 'between', align: 'center' })}>
          {props.label && (
            <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{props.label}</span>
          )}
          {props.valueLabel && <span class={cm.textSize('sm')}>{props.valueLabel}</span>}
        </div>
      )}
      <div
        class={cm.cn(cm.progress(), cm.progressHeight(size()))}
        role="progressbar"
        aria-valuenow={props.value}
        aria-valuemin={0}
        aria-valuemax={max()}
      >
        <div
          class={cm.cn(cm.progressBar(), cm.progressColor(color()))}
          style={{ width: `${fillPercent(props.value, max())}%` }}
        />
      </div>
    </div>
  )
}
