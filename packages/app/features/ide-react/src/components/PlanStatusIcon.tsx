import type { JSX } from 'react'
import { useId } from 'react'

import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'

import { Icon } from './Icon.js'

const SIZE = 14

/**
 * Status mark for one row of the working-plan card: the platform's check icon
 * when done, its molecule spinner while in progress, and an empty ring while
 * still to do.
 * @param props - Component props.
 * @param props.status - The task's status.
 * @param props.isLight - Whether the light theme is active (ring colour).
 * @returns The status mark.
 */
export function PlanStatusIcon({
  status,
  isLight,
}: {
  status: string
  isLight: boolean
}): JSX.Element {
  const gradientId = `mol-plan-spinner-${useId().replace(/[:]/g, '')}`
  if (status === 'completed') {
    return <Icon name="check-circle" size={SIZE} aria-hidden style={{ color: '#3fb950' }} />
  }
  if (status === 'in_progress') {
    return (
      <span
        aria-hidden
        style={{ display: 'inline-flex', flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: moleculeSpinnerMarkSvg({ size: SIZE, gradientId }) }}
      />
    )
  }
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        boxSizing: 'border-box',
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        border: `1.5px solid ${isLight ? '#afb8c1' : '#6e7681'}`,
      }}
    />
  )
}
