// @vitest-environment jsdom

/**
 * SYN4 + P5-08/P5-09 — the `/skills` browser's skill-authoring affordance and the
 * polished per-row actions render to the rule-11 bar.
 *
 * The MVP audit found the skill-authoring half of `/skills` entirely unbuilt; the
 * P5 polish pass then fixed the row actions (a stray "+" glyph on "New skill", a
 * Load button that read as faded text, an opacity-faded star that never read as
 * a real default, and hover tooltips nobody needed). This is a real jsdom render
 * of {@link SkillsCard} (not a source grep), using the REAL
 * `@molecule/app-ui-tailwind` ClassMap so resolved classes are actual theme
 * tokens. It pins:
 *
 * - a "New skill" affordance that is a PLAIN TEXT button — no leading "+" glyph
 *   (neither an `<svg>` icon nor a unicode char) — gated on `onCreate`;
 * - clicking it opens an inline name form whose submit calls `onCreate`, and the
 *   created skill is added to the list without a re-fetch;
 * - mounting with `startCreating` opens that form immediately (the bare
 *   `/newskill` path);
 * - the per-row **Load** action is a real (`outline`, bordered) button — NOT
 *   faded ghost text — with NO hover tooltip and NO native `title`;
 * - the per-row default toggle is a star {@link Icon} that is FILLED (`star`) for
 *   a default skill and HOLLOW (`star-outline`) otherwise, carries an
 *   `aria-label`, and has NO hover tooltip.
 *
 * Every assertion fails if the polish is reverted (the "+" returns, Load goes
 * back to ghost/title, the star reverts to the opacity trick, or a tooltip
 * reappears on a row action).
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
  it('renders the "New skill" affordance as a plain text button with no leading "+" glyph', async () => {
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
    // P5-08: the leading "+" is removed — neither an <svg> plus icon …
    expect(
      newBtn.querySelector('svg'),
      'the "New skill" button must not carry a leading "+" icon',
    ).toBeNull()
    // … nor a unicode "+" char in the label.
    expect(newBtn.textContent).not.toContain('+')
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

  it('mounts with the form already open when startCreating is set (bare /newskill)', async () => {
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

describe('SkillsCard — Load action is a real button with no hover tip / native title (P5-09)', () => {
  it('renders Load as a bordered (outline) button, mounts no tooltip on hover, and never a title', async () => {
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

    // It reads as a real button (the `outline` variant resolves to a bordered
    // class), NOT the borderless `ghost` it used to be (which read as faded text).
    expect(load.className, 'Load must read as a real (bordered) button').toContain('border')

    // No styled Tooltip mounts on hover anymore (P5-09a removed it).
    fireEvent.mouseEnter(load.parentElement as HTMLElement)
    expect(
      document.body.querySelector('[role="tooltip"]'),
      'the Load action must have no hover tooltip',
    ).toBeNull()
    fireEvent.mouseLeave(load.parentElement as HTMLElement)

    // The action still loads the skill.
    fireEvent.click(load)
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0][0]).toMatchObject({ path: '.agents/skills/auth/SKILL.md' })
  })
})

describe('SkillsCard — default toggle: hollow vs filled star, aria-label, no tooltip (P5-09)', () => {
  const AUTH_PATH = '.agents/skills/auth/SKILL.md'

  /**
   * Render the card with a name-distinguishing icon set so the rendered `<path d>`
   * equals the requested glyph name — lets us prove the hollow/filled distinction.
   *
   * @param defaultSkillPaths - The persisted default-loaded set passed to the card.
   * @returns The render result's `container`.
   */
  function renderWithDefaults(defaultSkillPaths: ReadonlySet<string>): HTMLElement {
    // Each glyph resolves to a single path whose `d` is the icon NAME, so the DOM
    // reveals which star variant rendered (filled `star` vs hollow `star-outline`).
    setIconSet(new Proxy({}, { get: (_t, name) => ({ paths: [{ d: String(name) }] }) }))
    const { container } = render(
      <Wrap>
        <SkillsCard
          projectId={PROJECT_ID}
          initialQuery=""
          onLoad={() => {}}
          onToggleDefault={() => {}}
          defaultSkillPaths={defaultSkillPaths}
          isLight={false}
        />
      </Wrap>,
    )
    return container
  }

  it('renders a HOLLOW star (star-outline) with the "Load by default" aria-label and no tooltip when NOT a default', async () => {
    const container = renderWithDefaults(new Set())
    const star = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el, 'the default toggle must render').not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    expect(star.getAttribute('aria-pressed')).toBe('false')
    expect(star.getAttribute('aria-label')).toBe('Load by default')
    expect(star.hasAttribute('title'), 'the toggle must not use a native title').toBe(false)
    // Hollow glyph: the name-distinguishing icon set renders `d="star-outline"`.
    expect(star.querySelector('svg path')?.getAttribute('d')).toBe('star-outline')

    // No tooltip mounts on hover.
    fireEvent.mouseEnter(star)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    fireEvent.mouseLeave(star)
  })

  it('renders a FILLED star (star) with the "Stop loading by default" aria-label when the skill IS a default', async () => {
    const container = renderWithDefaults(new Set([AUTH_PATH]))
    const star = (await waitFor(() => {
      const el = container.querySelector('[data-mol-id="skill-default-auth"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    expect(star.getAttribute('aria-pressed')).toBe('true')
    expect(star.getAttribute('aria-label')).toBe('Stop loading by default')
    // Filled glyph: `name="star"` (which the molecule icon set maps to `star-fill`).
    expect(star.querySelector('svg path')?.getAttribute('d')).toBe('star')
    // The "Default" badge also surfaces, so a seeded default reads as default on
    // first view without any click.
    expect(container.querySelector('[data-mol-id="skill-default-badge-auth"]')).not.toBeNull()
  })
})
