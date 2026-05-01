/**
 * Unit tests for `<MuscleGroupBadge>` — anatomical muscle group chip.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

import { defaultLabelFor, MuscleGroupBadge } from '../MuscleGroupBadge.js'
import type { MuscleGroup } from '../types.js'

afterEach(() => {
  cleanup()
})

describe('defaultLabelFor', () => {
  it('returns a capitalised English label for every group', () => {
    const groups: MuscleGroup[] = [
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'glutes',
      'quads',
      'hamstrings',
      'calves',
      'fullBody',
    ]
    for (const g of groups) {
      const lbl = defaultLabelFor(g)
      expect(lbl).toMatch(/^[A-Z]/)
      expect(lbl.length).toBeGreaterThan(0)
    }
  })

  it('uses "Full body" for the fullBody group', () => {
    expect(defaultLabelFor('fullBody')).toBe('Full body')
  })
})

describe('<MuscleGroupBadge>', () => {
  it('renders the translated label by default', () => {
    render(<MuscleGroupBadge group="chest" />)
    expect(screen.getByText('Chest')).toBeDefined()
  })

  it('renders an SVG body silhouette glyph', () => {
    const { container } = render(<MuscleGroupBadge group="back" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('exposes data-group for downstream styling/tests', () => {
    const { container } = render(<MuscleGroupBadge group="quads" />)
    expect(container.querySelector('[data-group="quads"]')).not.toBeNull()
  })

  it('honors an explicit label override', () => {
    render(<MuscleGroupBadge group="chest" label="Pecs" />)
    expect(screen.getByText('Pecs')).toBeDefined()
    expect(screen.queryByText('Chest')).toBeNull()
  })

  it('paints the border in the per-group accent', () => {
    const { container } = render(<MuscleGroupBadge group="chest" />)
    const wrap = container.querySelector('[data-group="chest"]') as HTMLElement
    // chest accent = #ef4444
    expect(wrap.style.border).toContain('rgb(239, 68, 68)')
  })

  it('honors an explicit accentColor override', () => {
    const { container } = render(<MuscleGroupBadge group="chest" accentColor="rgb(0, 128, 0)" />)
    const wrap = container.querySelector('[data-group="chest"]') as HTMLElement
    expect(wrap.style.border).toContain('rgb(0, 128, 0)')
  })

  it('shrinks padding in compact variant', () => {
    const { rerender, container } = render(<MuscleGroupBadge group="chest" />)
    const def = (container.querySelector('[data-group="chest"]') as HTMLElement).style.padding
    rerender(<MuscleGroupBadge group="chest" variant="compact" />)
    const compact = (container.querySelector('[data-group="chest"]') as HTMLElement).style.padding
    expect(def).not.toBe(compact)
  })

  it('renders all 12 standard groups without throwing', () => {
    const groups: MuscleGroup[] = [
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'glutes',
      'quads',
      'hamstrings',
      'calves',
      'fullBody',
    ]
    for (const g of groups) {
      const { container, unmount } = render(<MuscleGroupBadge group={g} />)
      expect(container.querySelector(`[data-group="${g}"]`)).not.toBeNull()
      unmount()
    }
  })

  it('exposes role="group" with a translated aria-label', () => {
    render(<MuscleGroupBadge group="chest" />)
    const grp = screen.getByRole('group')
    expect(grp.getAttribute('aria-label')).toBe('Chest muscle group')
  })

  it('forwards dataMolId for agent automation', () => {
    const { container } = render(<MuscleGroupBadge dataMolId="exercise-target" group="chest" />)
    expect(container.querySelector('[data-mol-id="exercise-target"]')).not.toBeNull()
  })
})
