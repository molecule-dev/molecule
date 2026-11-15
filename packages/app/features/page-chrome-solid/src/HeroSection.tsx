/**
 * Solid dashboard / landing hero: text column on the left, optional media on
 * the right.
 *
 * Solid counterpart of `@molecule/app-page-chrome-react`'s `HeroSection` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { HeroSectionProps } from './types.js'

/**
 * Dashboard / landing hero. Text column on the left, optional media on
 * the right. Alignment defaults to `start` for dashboards; use
 * `align="center"` for marketing-style landing heroes.
 *
 * @param props - Component props (see {@link HeroSectionProps}).
 * @returns The rendered hero section.
 */
export const HeroSection: Component<HeroSectionProps> = (props) => {
  const cm = getClassMap()
  const align = (): 'start' | 'center' => props.align ?? 'start'
  return (
    <section
      class={cm.cn(
        cm.flex({
          align: 'center',
          justify: props.media ? 'between' : 'start',
          gap: 'lg',
          wrap: 'wrap',
        }),
        cm.sp('py', 10),
        props.className,
      )}
      data-mol-id={props.dataMolId}
    >
      <div class={cm.cn(cm.stack(4), cm.flex1, align() === 'center' ? cm.textCenter : undefined)}>
        {props.eyebrow ? (
          <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.eyebrow}</div>
        ) : null}
        <h1 class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>{props.title}</h1>
        {props.description ? (
          <p class={cm.cn(cm.textSize('lg'), cm.maxW('2xl'))}>{props.description}</p>
        ) : null}
        {props.primaryAction || props.secondaryAction ? (
          <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {props.primaryAction}
            {props.secondaryAction}
          </div>
        ) : null}
      </div>
      {props.media ? <div class={cm.shrink0}>{props.media}</div> : null}
    </section>
  )
}
