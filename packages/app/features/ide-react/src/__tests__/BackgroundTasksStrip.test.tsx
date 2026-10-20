// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../components/BackgroundTasksStrip.js'

vi.mock('@molecule/app-react', () => ({ useThemeMode: () => 'light' }))
beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})
afterEach(cleanup)

describe('background progress', () => {
  it('shows measured output in collapsed and expanded states without inventing a percentage', () => {
    const { container, rerender } = render(
      <BackgroundTasksStrip
        tasks={[
          {
            id: 'summary',
            kind: 'agent',
            command: 'Summarize context',
            status: 'running',
            startedAt: Date.now(),
            outputChars: 1024,
          },
        ]}
      />,
    )
    expect(container.textContent).toContain('1,024 characters produced')
    expect(container.textContent).not.toContain('%')
    fireEvent.click(screen.getByRole('button'))
    expect(container.textContent).toContain('1,024 characters produced')
    rerender(
      <BackgroundTasksStrip
        tasks={[
          {
            id: 'summary',
            kind: 'agent',
            command: 'Summarize context',
            status: 'cancelled',
            startedAt: 1000,
            finishedAt: 2000,
            outputChars: 1024,
          },
        ]}
      />,
    )
    expect(container.textContent).toContain('cancelled · 1s')
    expect(container.textContent).not.toContain('failed')
    expect(container.textContent).not.toContain('done')
  })
})
