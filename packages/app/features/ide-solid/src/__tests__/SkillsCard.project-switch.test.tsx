// @vitest-environment jsdom

/**
 * `SkillsCard` can be re-pointed at another project without a remount (the IDE
 * reuses the card).
 *
 * A port of `@molecule/app-ide-react/src/__tests__/SkillsCard.project-switch.test.tsx`
 * with the same test name and the same assertions, mounted as a real Solid
 * root under an http context (the card fetches its own listing). The card
 * returns to its loading state in the render that carries the new project id,
 * so the previous project's skills are never shown under the new one.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { setIconSet } from '@molecule/app-icons'
import { HttpContext } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SkillsCard } from '../parts/SkillsCard.jsx'

/** One skill per project, so a stale list is unmistakable. */
const SKILL_BY_PROJECT: Record<string, string> = { p1: 'p1only', p2: 'p2only' }

/**
 * The SKILL.md body that makes a skill discoverable.
 * @param name - The skill name.
 * @returns The markdown file content.
 */
function skillContent(name: string): string {
  return ['---', `name: ${name}`, `description: The ${name} skill.`, '---', '', `# ${name}`].join(
    '\n',
  )
}

/**
 * A typed {@link HttpResponse} wrapper for a resolved value.
 * @param data - The response body.
 * @returns The response.
 */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as HttpResponse<T>['config'],
  }
}

/**
 * Serves each project exactly one skill of its own.
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      const list = /\/projects\/([^/]+)\/files-list$/.exec(url)
      if (list) {
        const name = SKILL_BY_PROJECT[list[1]]
        return ok({ files: name ? [`.agents/skills/${name}/SKILL.md`] : [] })
      }
      const file = /\/projects\/([^/]+)\/files\/(.+)$/.exec(url)
      if (file) {
        const name = SKILL_BY_PROJECT[file[1]]
        return ok({ content: skillContent(name) })
      }
      throw new Error(`unexpected GET ${url}`)
    }) as HttpClient['get'],
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

/** The no-op props the card needs (no load/create affordances in this test). */
const noopProps = { initialQuery: '', onLoad: () => {}, isLight: true }

describe('SkillsCard project switch', () => {
  it('drops the previous project’s skills and reloads when the project id changes', async () => {
    const [projectId, setProjectId] = createSignal('p1')
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <HttpContext.Provider value={buildHttpClient()}>
          <SkillsCard projectId={projectId()} {...noopProps} />
        </HttpContext.Provider>
      ),
      container,
    )
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).not.toBeNull(),
    )

    setProjectId('p2')

    // The render carrying the new project id already reports loading, so p1's
    // skill is not painted under p2.
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
    expect(container.textContent).toContain('Loading skills')

    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-open-p2only"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
  })
})
