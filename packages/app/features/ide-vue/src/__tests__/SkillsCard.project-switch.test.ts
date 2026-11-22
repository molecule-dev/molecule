// @vitest-environment jsdom

/**
 * `SkillsCard` can be re-pointed at another project without a remount (the IDE
 * reuses the card). The card returns to its loading state in the render that
 * carries the new project id, so the previous project's skills are never shown
 * under the new one — these tests pin that reset and the reload that follows it.
 *
 * A port of `@molecule/app-ide-react`'s `SkillsCard.project-switch` suite with
 * the same test names and the same assertions, mounted through Vue's own
 * `createApp` with the http plugin (and the global i18n provider).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin } from '@molecule/app-vue'

import type { SkillsCardProps } from '../parts/SkillsCard.js'
import { SkillsCard } from '../parts/SkillsCard.js'

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

/** The live project id; reassigning it is the test's `rerender`. */
const live = ref<string>('p1')

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** The no-op props the card needs (no load/create affordances in this test). */
const noopProps = { initialQuery: '', onLoad: () => {}, isLight: true }

/**
 * Mounts the card standalone and hands back its host plus a `rerender`.
 *
 * @param initialProject - The first project id.
 * @returns The host element and the project-id mutator.
 */
function renderSkillsCard(initialProject: string): {
  container: HTMLElement
  rerender: (next: string) => Promise<void>
} {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  live.value = initialProject
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(SkillsCard, {
          projectId: live.value,
          ...noopProps,
        } satisfies SkillsCardProps),
    }),
  )
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(container)
  return {
    container,
    rerender: async (next): Promise<void> => {
      live.value = next
      await nextTick()
    },
  }
}

describe('SkillsCard project switch', () => {
  it('drops the previous project’s skills and reloads when the project id changes', async () => {
    const { container, rerender } = renderSkillsCard('p1')
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).not.toBeNull(),
    )

    await rerender('p2')

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
