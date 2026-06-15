// @vitest-environment jsdom

/**
 * SYN4 — the `/skills` browser's skill-authoring affordance + Tooltip-migrated
 * Load action render to the rule-11 bar.
 *
 * The MVP audit found the skill-authoring half of `/skills` entirely unbuilt and
 * the browser's Load button still on the delayed, touch-blind native `title`
 * (only the proactive suggestion had been migrated). This is a real jsdom render
 * of {@link SkillsCard} (not a source grep), using the REAL
 * `@molecule/app-ui-tailwind` ClassMap so resolved classes are actual theme
 * tokens. It pins:
 *
 * - a "New skill" affordance whose glyph is a real `<svg>` from the icon set
 *   (never a unicode character), gated on `onCreate`;
 * - clicking it opens an inline name form whose submit calls `onCreate`, and the
 *   created skill is added to the list without a re-fetch;
 * - mounting with `startCreating` opens that form immediately (the bare
 *   `/new-skill` path);
 * - the per-row **Load** action uses the framework's REAL styled `Tooltip`
 *   (a `role="tooltip"` popover on hover), NEVER a native `title`.
 *
 * Every assertion fails if the affordance is reverted or the Load button is
 * regressed back to a native `title`.
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { SkillInfo } from '../components/chat-skills-utilities.js'
import { SkillsCard } from '../components/SkillsCard.js'

const PROJECT_ID = 'p1'
const AUTH_SKILL_CONTENT = [
  '---',
  'name: auth',
  'description: Authentication, login, OAuth and sessions.',
  '---',
  '',
  '# auth',
].join('\n')

/** A typed {@link HttpResponse} wrapper for a resolved value. */
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
 * An HTTP client that serves a single discoverable skill (`auth`) so the card
 * reaches `ready` with one row to act on. Writes/other verbs reject (the card
 * never calls them; creation is delegated to the injected `onCreate`).
 *
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('not used in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      if (url.endsWith('/files-list')) return ok({ files: ['.agents/skills/auth/SKILL.md'] })
      if (url.includes('/files/')) return ok({ content: AUTH_SKILL_CONTENT })
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

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  cleanup()
})

describe('SkillsCard — skill authoring (SYN4)', () => {
  it('renders the "New skill" affordance with a real SVG glyph (never a unicode char)', async () => {
    const { container } = render(
      <Wrap>
        <SkillsCard
          projectId={PROJECT_ID}
          initialQuery=""
          onLoad={() => {}}
          onCreate={vi.fn()}
          isLight={false}
        />
      </Wrap>,
    )
    const newBtn = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-new"]')
      expect(el, 'the "New skill" affordance must render').not.toBeNull()
      return el as HTMLElement
    })
    expect(newBtn.textContent).toContain('New skill')
    expect(
      newBtn.querySelector('svg'),
      'the New skill glyph must be a real <svg> icon, not a unicode char',
    ).not.toBeNull()
  })

  it('hides the "New skill" affordance when onCreate is not provided', async () => {
    const { container } = render(
      <Wrap>
        <SkillsCard projectId={PROJECT_ID} initialQuery="" onLoad={() => {}} isLight={false} />
      </Wrap>,
    )
    // Wait for the list to settle, then confirm the affordance is absent.
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-load-auth"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="skill-new"]')).toBeNull()
  })

  it('opens the inline form, submits the name to onCreate, and lists the new skill', async () => {
    const created: SkillInfo = {
      path: '.agents/skills/caching/SKILL.md',
      name: 'Caching',
      description: 'When and how to cache.',
    }
    const onCreate = vi.fn(async (_name: string): Promise<SkillInfo | null> => created)

    const { container } = render(
      <Wrap>
        <SkillsCard
          projectId={PROJECT_ID}
          initialQuery=""
          onLoad={() => {}}
          onCreate={onCreate}
          isLight={false}
        />
      </Wrap>,
    )

    const newBtn = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-new"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })

    // No form until the user opts in.
    expect(container.querySelector('[data-mol-id="skill-create-form"]')).toBeNull()
    fireEvent.click(newBtn)

    const input = container.querySelector('[data-mol-id="skill-create-name"]') as HTMLInputElement
    expect(input, 'the inline name form must open on click').not.toBeNull()
    const submit = container.querySelector(
      '[data-mol-id="skill-create-submit"]',
    ) as HTMLButtonElement
    // Submit is disabled until a non-blank name is typed.
    expect(submit.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'Caching' } })
    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith('Caching')

    // The created skill appears in the list (no re-fetch needed), and the form closes.
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-row-Caching"]')).not.toBeNull(),
    )
    expect(container.querySelector('[data-mol-id="skill-create-form"]')).toBeNull()
  })

  it('mounts with the form already open when startCreating is set (bare /new-skill)', async () => {
    const { container } = render(
      <Wrap>
        <SkillsCard
          projectId={PROJECT_ID}
          initialQuery=""
          onLoad={() => {}}
          onCreate={vi.fn()}
          startCreating
          isLight={false}
        />
      </Wrap>,
    )
    await waitFor(() =>
      expect(container.querySelector('[data-mol-id="skill-create-name"]')).not.toBeNull(),
    )
  })
})

describe('SkillsCard — Load action uses the styled Tooltip, not native title (SYN4)', () => {
  it('mounts a role="tooltip" popover on hover and never a native title attribute', async () => {
    const onLoad = vi.fn()
    const { container } = render(
      <Wrap>
        <SkillsCard
          projectId={PROJECT_ID}
          initialQuery=""
          onLoad={onLoad}
          onCreate={vi.fn()}
          isLight={false}
        />
      </Wrap>,
    )

    const load = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-load-auth"]')
      expect(el, 'the skill row + Load action must render').not.toBeNull()
      return el as HTMLElement
    })

    // The Load button must NOT carry the delayed, touch-blind native title.
    expect(load.hasAttribute('title'), 'Load must not use a native title').toBe(false)

    // Hovering the Tooltip trigger (the button's wrapper) mounts a role="tooltip"
    // popover whose text is the load hint — a native title produces no such node.
    fireEvent.mouseEnter(load.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'the styled Tooltip must mount on hover').not.toBeNull()
    expect(tooltip?.textContent).toBe('Open in editor and attach as context')
    fireEvent.mouseLeave(load.parentElement as HTMLElement)

    // The action still loads the skill.
    fireEvent.click(load)
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0][0]).toMatchObject({ path: '.agents/skills/auth/SKILL.md' })
  })
})
