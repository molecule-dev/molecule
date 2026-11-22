// @vitest-environment jsdom

/**
 * `SkillsCard` can be re-pointed at another project without a remount (the IDE
 * reuses the card). The card returns to its loading state in the render that
 * carries the new project id, so the previous project's skills are never shown
 * under the new one — these tests pin that reset and the reload that follows it.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/SkillsCard.project-switch.test.tsx`
 * with the same test name and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import SkillsCardProjectHost from './SkillsCardProjectHost.svelte'

/** One skill per project, so a stale list is unmistakable. */
const SKILL_BY_PROJECT: Record<string, string> = { p1: 'p1only', p2: 'p2only' }

/**
 * The SKILL.md body that makes a skill discoverable.
 *
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
 *
 * @param data - The response body.
 * @returns The response.
 */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/**
 * Serves each project exactly one skill of its own.
 *
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

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the card at a project.
 *
 * @param projectId - The project whose skills are listed.
 * @returns The container and a project replacer.
 */
function render(projectId: string): {
  container: HTMLElement
  setProject: (next: string) => void
} {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const mounted = mount(SkillsCardProjectHost, {
    target: container,
    props: {
      http: buildHttpClient(),
      initial: { projectId, initialQuery: '', onLoad: () => {}, isLight: true },
    },
  })
  teardown = () => unmount(mounted)
  flushSync()
  const host = container
  return {
    container: host,
    setProject: (next: string): void => {
      mounted.setProps({ projectId: next, initialQuery: '', onLoad: () => {}, isLight: true })
      flushSync()
    },
  }
}

describe('SkillsCard project switch', () => {
  it('drops the previous project’s skills and reloads when the project id changes', async () => {
    const { container: host, setProject } = render('p1')
    await vi.waitFor(() =>
      expect(host.querySelector('[data-mol-id="skill-open-p1only"]')).not.toBeNull(),
    )

    setProject('p2')

    // The render carrying the new project id already reports loading, so p1's
    // skill is not painted under p2.
    expect(host.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
    expect(host.textContent).toContain('Loading skills')

    await vi.waitFor(() =>
      expect(host.querySelector('[data-mol-id="skill-open-p2only"]')).not.toBeNull(),
    )
    expect(host.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
  })
})
