// @vitest-environment jsdom

/**
 * `SkillsCard` can be re-pointed at another project without a remount (the IDE
 * reuses the card). The card returns to its loading state in the render that
 * carries the new project id, so the previous project's skills are never shown
 * under the new one — these tests pin that reset and the reload that follows it.
 *
 * @module
 */

import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SkillsCard } from '../components/SkillsCard.js'

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

/**
 * Wrap children with the i18n + http providers the card resolves against.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </I18nProvider>
  )
}

/** The no-op props the card needs (no load/create affordances in this test). */
const noopProps = { initialQuery: '', onLoad: () => {}, isLight: true }

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(cleanup)

describe('SkillsCard project switch', () => {
  it('drops the previous project’s skills and reloads when the project id changes', async () => {
    const { container, rerender } = render(
      <Wrap>
        <SkillsCard projectId="p1" {...noopProps} />
      </Wrap>,
    )
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).not.toBeNull(),
    )

    rerender(
      <Wrap>
        <SkillsCard projectId="p2" {...noopProps} />
      </Wrap>,
    )

    // The render carrying the new project id already reports loading, so p1's
    // skill is not painted under p2.
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
    expect(container.textContent).toContain('Loading skills')

    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-open-p2only"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
  })
})
