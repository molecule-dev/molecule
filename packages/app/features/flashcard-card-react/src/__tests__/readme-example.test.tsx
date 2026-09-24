// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FlashcardCard, type SrsGrade } from '../index.js'

const deck = [
  { id: 'fr-1', front: 'What is the capital of France?', back: 'Paris' },
  { id: 'fr-2', front: 'What is the capital of Japan?', back: 'Tokyo' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered study view.
 */
function StudyView(): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [grades, setGrades] = useState<Record<string, SrsGrade>>({})
  const card = deck[index]
  if (!card) return <p>Deck complete: {Object.values(grades).join(', ')}</p>
  return (
    <FlashcardCard
      front={card.front}
      back={card.back}
      progress={`Card ${index + 1} of ${deck.length}`}
      onGrade={(grade) => {
        setGrades((prev) => ({ ...prev, [card.id]: grade })) // feed your SM-2 scheduler here
        setIndex(index + 1)
      }}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('reveals, grades and advances through the deck', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <StudyView />
      </I18nProvider>,
    )
    expect(view.getByText('Card 1 of 2')).toBeTruthy()
    expect(view.getByText('What is the capital of France?')).toBeTruthy()
    expect(view.queryByText('Paris')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Show answer' }))
    expect(view.getByText('Paris')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Good' }))

    expect(view.getByText('Card 2 of 2')).toBeTruthy()
    expect(view.getByText('What is the capital of Japan?')).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Good' })).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Show answer' }))
    fireEvent.click(view.getByRole('button', { name: 'Again' }))

    expect(view.getByText('Deck complete: good, again')).toBeTruthy()
  })
})
