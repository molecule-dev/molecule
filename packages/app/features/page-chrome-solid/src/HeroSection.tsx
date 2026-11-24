/**
 * Solid dashboard / landing hero: text column on the left, optional media on
 * the right.
 *
 * Solid counterpart of `@molecule/app-page-chrome-react`'s `HeroSection` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
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
    // A media column that renders nothing is absent, so the root justify stays `start`.
    <ResolveNode node={props.media}>
      {(media, hasMedia) => (
        <section
          class={cm.cn(
            cm.flex({
              align: 'center',
              justify: hasMedia() ? 'between' : 'start',
              gap: 'lg',
              wrap: 'wrap',
            }),
            cm.sp('py', 10),
            props.className,
          )}
          data-mol-id={props.dataMolId}
        >
          <div
            class={cm.cn(cm.stack(4), cm.flex1, align() === 'center' ? cm.textCenter : undefined)}
          >
            <PresentWhileNode node={props.eyebrow}>
              {(eyebrow) => (
                <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{eyebrow()}</div>
              )}
            </PresentWhileNode>
            <h1 class={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>{props.title}</h1>
            <PresentWhileNode node={props.description}>
              {(description) => (
                <p class={cm.cn(cm.textSize('lg'), cm.maxW('2xl'))}>{description()}</p>
              )}
            </PresentWhileNode>
            <ResolveNode node={props.primaryAction}>
              {(primary, hasPrimary) => (
                <ResolveNode node={props.secondaryAction}>
                  {(secondary, hasSecondary) => (
                    <Show when={hasPrimary() || hasSecondary()}>
                      <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                        {hasPrimary() ? primary() : null}
                        {hasSecondary() ? secondary() : null}
                      </div>
                    </Show>
                  )}
                </ResolveNode>
              )}
            </ResolveNode>
          </div>
          <Show when={hasMedia()}>
            <div class={cm.shrink0}>{media()}</div>
          </Show>
        </section>
      )}
    </ResolveNode>
  )
}
