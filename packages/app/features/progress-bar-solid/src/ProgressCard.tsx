import { type Component, createUniqueId, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import { ProgressBar } from './ProgressBar.jsx'
import type { ProgressCardProps } from './types.js'

/**
 * `<Card>`-wrapped progress display with title, optional icon and description,
 * the progress bar itself, and an optional extras slot below. Useful for
 * budget/goal cards, storage-used panels, onboarding progress, etc.
 *
 * The bar is named by the title (`aria-labelledby`) and, when a description
 * renders, described by it (`aria-describedby`).
 *
 * This is the Solid counterpart of `@molecule/app-progress-bar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link ProgressCardProps}).
 * @returns The rendered progress card.
 */
export const ProgressCard: Component<ProgressCardProps> = (props) => {
  const cm = getClassMap()
  const titleId = createUniqueId()
  const descriptionId = createUniqueId()
  const max = (): number => props.max ?? 100
  const color = (): 'primary' | 'success' | 'warning' | 'error' | 'info' => props.color ?? 'primary'

  return (
    <Card className={props.className}>
      <ResolveNode node={props.description}>
        {(description, hasDescription) => (
          <div class={cm.stack(3)}>
            <div class={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
              <div class={cm.flex({ align: 'center', gap: 'sm' })}>
                {props.icon}
                <div>
                  <h3 id={titleId} class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {props.title}
                  </h3>
                  <Show when={hasDescription()}>
                    <p id={descriptionId} class={cm.textSize('sm')}>
                      {description()}
                    </p>
                  </Show>
                </div>
              </div>
              <PresentWhileNode node={props.valueLabel}>
                {(valueLabel) => (
                  <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {valueLabel()}
                  </span>
                )}
              </PresentWhileNode>
            </div>
            <ProgressBar
              value={props.value}
              max={max()}
              color={color()}
              labelledBy={titleId}
              describedBy={hasDescription() ? descriptionId : undefined}
            />
            {props.children}
          </div>
        )}
      </ResolveNode>
    </Card>
  )
}
