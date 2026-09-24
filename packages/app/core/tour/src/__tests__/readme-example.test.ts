// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the REAL shepherd.js bond in
 * happy-dom: the tour renders its tooltip + buttons into the document, and
 * clicking the rendered Next / Done buttons completes the tour.
 *
 * @module
 */
import 'shepherd.js/dist/css/shepherd.css'
import { afterEach, describe, expect, it } from 'vitest'

import { createProvider } from '@molecule/app-tour-shepherd'

import { requireProvider, setProvider } from '../index.js'

/**
 * Finds a rendered shepherd button by its visible label.
 *
 * @param label - The button text.
 * @returns The button element, if rendered.
 */
const findButton = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  )

describe('README @example', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the first step and completes when the user clicks Next then Done', async () => {
    document.body.innerHTML =
      '<button data-mol-id="new-project-button"></button><div data-mol-id="editor"></div>'

    setProvider(createProvider({ labels: { back: 'Back', next: 'Next', done: 'Done' } }))

    let tourSeen = false
    const tour = requireProvider().createTour({
      steps: [
        {
          target: '[data-mol-id="new-project-button"]',
          title: 'Create a project',
          content: 'Every app starts here.',
        },
        {
          target: '[data-mol-id="editor"]',
          title: 'Editor',
          content: 'Write code here.',
          placement: 'right',
        },
      ],
      onComplete: () => {
        tourSeen = true
      },
      onCancel: () => {
        tourSeen = true
      },
    })

    if (!tourSeen) tour.start()
    expect(tour.isActive()).toBe(true)
    expect(tour.getCurrentStep()).toBe(0)

    await expect.poll(() => document.body.textContent).toContain('Every app starts here.')
    findButton('Next')?.click()

    await expect.poll(() => tour.getCurrentStep()).toBe(1)
    await expect.poll(() => document.body.textContent).toContain('Write code here.')
    expect(findButton('Back')).toBeDefined()

    await expect.poll(() => findButton('Done')).toBeDefined()
    findButton('Done')?.click()

    expect(tourSeen).toBe(true)
    expect(tour.isActive()).toBe(false)
  })
})
