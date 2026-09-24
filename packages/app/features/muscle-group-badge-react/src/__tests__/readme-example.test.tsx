// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type MuscleGroup, MuscleGroupBadge } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered exercise muscle badges.
 */
function ExerciseMuscles(): React.JSX.Element {
  const exercise: { name: string; primary: MuscleGroup; secondary: MuscleGroup[] } = {
    name: 'Barbell bench press',
    primary: 'chest',
    secondary: ['triceps', 'shoulders'],
  }
  return (
    <section>
      <h2>{exercise.name}</h2>
      <MuscleGroupBadge group={exercise.primary} size="lg" />
      {exercise.secondary.map((group) => (
        <MuscleGroupBadge key={group} group={group} variant="compact" size="sm" />
      ))}
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders a large primary badge and compact secondary badges with English labels', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ExerciseMuscles />
      </I18nProvider>,
    )
    expect(html).toContain('Barbell bench press')
    expect(html).toContain('aria-label="Chest muscle group"')
    expect(html).toContain('aria-label="Triceps muscle group"')
    expect(html).toContain('aria-label="Shoulders muscle group"')
    expect(html.match(/data-mol-id="muscle-group-badge"/g)).toHaveLength(3)
    expect(html).toContain('width="72"')
    expect(html.match(/width="32"/g)).toHaveLength(2)
    expect(html).toContain('border:1px solid #ef4444')
  })
})
