// @vitest-environment jsdom

/**
 * The working plan is one card pinned above the composer: it shows the LATEST
 * `update_task_list` call (a check circle when done, the molecule spinner while
 * in progress, an empty ring to do — no text glyphs, no "!" marker), and the
 * transcript no longer repeats it on every update.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../components/BackgroundTasksStrip.js'
import { latestPlan, PlanCard } from '../components/PlanCard.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import { WorkCard } from '../components/WorkCard.js'

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

const todos = [
  { content: 'Write tests', status: 'completed', priority: 'high' },
  { content: 'Fix the card', status: 'in_progress', priority: 'high' },
  { content: 'Ship it', status: 'pending', priority: 'high' },
]

function inProviders(ui: ReactElement): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{ui}</ThemeProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('latestPlan', () => {
  it('returns the most recent update_task_list call, not the first', () => {
    const messages = [
      {
        toolCalls: [
          { name: 'update_task_list', input: { todos: [{ content: 'Old', status: 'pending' }] } },
        ],
      },
      { toolCalls: [{ name: 'read_file', input: { path: 'a.ts' } }] },
      { toolCalls: [{ name: 'update_task_list', input: { todos } }] },
    ]
    expect(latestPlan(messages).map((r) => r.content)).toEqual([
      'Write tests',
      'Fix the card',
      'Ship it',
    ])
  })

  it('is empty when the transcript has no plan', () => {
    expect(latestPlan([{ toolCalls: [{ name: 'read_file', input: {} }] }, {}])).toEqual([])
  })
})

const plan = latestPlan([{ toolCalls: [{ name: 'update_task_list', input: { todos } }] }])

function inTray(list: typeof plan): ReactElement {
  return inProviders(
    <WorkCard>
      <PlanCard todos={list} />
    </WorkCard>,
  )
}

describe('PlanCard in the work tray', () => {
  it('is one chip with progress, and opens to list every task with no text glyphs or priority marker', () => {
    const { container, getByText } = render(inTray(plan))
    expect(container.textContent).toContain('Plan 1/3')
    expect(container.textContent).not.toContain('Ship it')
    fireEvent.click(getByText('Plan 1/3'))
    const text = container.textContent ?? ''
    for (const label of ['Write tests', 'Fix the card', 'Ship it']) expect(text).toContain(label)
    for (const glyph of ['✓', '◐', '○', '!']) expect(text).not.toContain(glyph)
  })

  it('marks done with a tick, in progress with the spinner, to do with an empty ring', () => {
    const { container, getByText } = render(inTray(plan))
    fireEvent.click(getByText('Plan 1/3'))
    const rows = container.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].querySelector('svg path')?.getAttribute('d')).toBe('M2 5.2 4 7.2 8 3')
    expect(rows[1].querySelector('svg')).not.toBeNull()
    expect(rows[1].querySelector('svg path')?.getAttribute('d')).not.toBe('M2 5.2 4 7.2 8 3')
    expect(rows[2].querySelector('svg')).toBeNull()
  })

  it('closes again when its chip is clicked a second time', () => {
    const { container, getByText } = render(inTray(plan))
    fireEvent.click(getByText('Plan 1/3'))
    fireEvent.click(getByText('Plan 1/3'))
    expect(container.textContent).not.toContain('Ship it')
    expect(container.textContent).toContain('Plan 1/3')
  })

  it('opening another section closes this one', () => {
    const { container, getByText } = render(
      inProviders(
        <WorkCard>
          <PlanCard todos={plan} />
          <BackgroundTasksStrip
            tasks={[
              { id: 'mol-bg-1', command: 'npm test', status: 'running', startedAt: Date.now() },
            ]}
          />
        </WorkCard>,
      ),
    )
    fireEvent.click(getByText('Plan 1/3'))
    expect(container.textContent).toContain('Ship it')
    fireEvent.click(getByText('1 running'))
    expect(container.textContent).not.toContain('Ship it')
    expect(container.textContent).toContain('npm test')
  })

  it('does not spin a step when no turn is running: it says the work stopped', () => {
    const { container, getByText } = render(
      inProviders(
        <WorkCard>
          <PlanCard todos={plan} live={false} />
        </WorkCard>,
      ),
    )
    fireEvent.click(getByText('Plan 1/3'))
    const rows = container.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Stopped before finishing')
    expect(rows[1].textContent).not.toContain('Waiting for your answer')
    // The stopped mark is plain text in a ring, not the spinner's svg.
    expect(rows[1].querySelector('svg')).toBeNull()
  })

  it('says it is waiting for the person when the turn is paused on a question', () => {
    const { container, getByText } = render(
      inProviders(
        <WorkCard>
          <PlanCard todos={plan} live={false} awaitingUser />
        </WorkCard>,
      ),
    )
    fireEvent.click(getByText('Plan 1/3'))
    const rows = container.querySelectorAll('[data-mol-id="task-list-row"]')
    expect(rows[1].textContent).toContain('Waiting for your answer')
  })

  it('draws nothing for an empty plan', () => {
    const { container } = render(inTray([]))
    expect(container.textContent).toBe('')
  })
})

describe('ToolCallCard — update_task_list', () => {
  it('adds nothing to the transcript (the pinned plan card carries it)', () => {
    const { container } = render(
      inProviders(
        <ToolCallCard id="tc-plan" name="update_task_list" status="done" input={{ todos }} />,
      ),
    )
    expect(container.textContent).toBe('')
  })
})
