// @vitest-environment jsdom

/**
 * Everything about the work in flight shares ONE card: the plan, background tasks
 * and (given by the host) tests and files are sections of the same frame.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTasksStrip } from '../components/BackgroundTasksStrip.js'
import { latestPlan, PlanCard } from '../components/PlanCard.js'
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

const plan = latestPlan([
  {
    toolCalls: [
      {
        name: 'update_task_list',
        input: { todos: [{ content: 'Fix it', status: 'in_progress' }] },
      },
    ],
  },
])

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('WorkCard', () => {
  it('holds the plan and the background tasks in one frame', () => {
    const { container } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          <WorkCard>
            <PlanCard todos={plan} />
            <BackgroundTasksStrip
              tasks={[
                {
                  id: 'mol-bg-1',
                  command: 'npm test',
                  description: 'Run the tests',
                  status: 'running',
                  startedAt: Date.now(),
                },
              ]}
            />
          </WorkCard>
        </ThemeProvider>
      </I18nProvider>,
    )
    const frames = container.querySelectorAll('[data-mol-id="work-card"]')
    expect(frames).toHaveLength(1)
    expect(frames[0].querySelector('[data-mol-id="task-list-card"]')).not.toBeNull()
    expect(frames[0].querySelector('[data-mol-id="chat-background-tasks"]')).not.toBeNull()
  })
})
