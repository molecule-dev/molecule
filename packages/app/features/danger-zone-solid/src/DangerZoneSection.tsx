/**
 * Solid destructive-action section card.
 *
 * Solid counterpart of `@molecule/app-danger-zone-react`'s
 * `DangerZoneSection` — the same props (React names), the same DOM for the
 * same input: a Card with the title, the description, optional extra content
 * and the action button on the right (error/danger accent).
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import type { DangerZoneSectionProps } from './types.js'

/**
 * Card-wrapped section for destructive actions — delete account, reset data,
 * revoke access. Uses the error/danger accent color and puts the action on
 * the right. While `loading` is true the button disables and shows a loading
 * glyph.
 *
 * @param props - Component props (see {@link DangerZoneSectionProps}).
 * @returns The rendered section.
 */
export function DangerZoneSection(props: DangerZoneSectionProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Card className={props.className} data-mol-id={props.dataMolId}>
      <div class={cm.stack(3)}>
        <header class={cm.stack(1 as const)}>
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
          <p class={cm.textSize('sm')}>{props.description}</p>
        </header>
        {props.children}
        <div class={cm.flex({ justify: 'end' })}>
          <Button
            variant="solid"
            color="error"
            onClick={props.onAction}
            disabled={props.disabled || props.loading}
          >
            {props.loading ? '…' : props.actionLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}
