// @vitest-environment jsdom

/**
 * SYN4 + P5-08/P5-09 — the `/skills` browser's skill-authoring affordance and
 * the polished per-row actions: a port of `@molecule/app-ide-react`'s
 * `SkillsCard` suite with the same test names and the same assertions,
 * mounted through Solid's own `render` under the http provider (and the
 * global i18n provider), with the REAL `@molecule/app-ui-tailwind` ClassMap
 * so resolved classes are actual theme tokens.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SkillsCard } from '../parts/SkillsCard.jsx'

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

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose: () => void }[] = []

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(async () => {
  for (const entry of mounted.splice(0)) entry.dispose()
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Solid settle the render (and the render a state change queued). */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Mounts the card standalone, the way a host does — the ONLY provider it
 * needs is http, plus the global i18n provider.
 *
 * @param props - The card's props.
 * @returns The container.
 */
function renderSkillsCard(props: Record<string, unknown>): HTMLElement {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const dispose = render(
    () => (
      <MoleculeProvider http={buildHttpClient()}>
        <SkillsCard
          projectId={PROJECT_ID}
          initialQuery=""
          isLight={false}
          {...(props as { onLoad: (skill: SkillInfo) => void })}
        />
      </MoleculeProvider>
    ),
    host,
  )
  mounted.push({ dispose })
  return host
}

/** Types like a user: the value, then a bubbling `input` event. */
async function type(el: HTMLInputElement | null, value: string): Promise<void> {
  if (!el) throw new Error('missing element to type into')
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flush()
}

/** Hovers, lets the (possible) tooltip mount, unhover. */
async function hover(el: Element): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseenter'))
  await flush()
  el.dispatchEvent(new MouseEvent('mouseleave'))
  await flush()
}

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

describe('SkillsCard — skill authoring (SYN4)', () => {
  it('renders the "New skill" affordance as a plain text button with no leading "+" glyph', async () => {
    const container = renderSkillsCard({ onCreate: vi.fn() })
    const newBtn = await vi.waitFor(() => {
      const el = molId(container, 'skill-new')
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
    const container = renderSkillsCard({ onLoad: () => {} })
    // Wait for the list to settle, then confirm the affordance is absent.
    await vi.waitFor(() => expect(molId(container, 'skill-load-auth')).not.toBeNull())
    expect(molId(container, 'skill-new')).toBeNull()
  })

  it('opens the inline form, submits the name to onCreate, and lists the new skill', async () => {
    const created: SkillInfo = {
      path: '.agents/skills/caching/SKILL.md',
      name: 'Caching',
      description: 'When and how to cache.',
    }
    const onCreate = vi.fn(async (_name: string): Promise<SkillInfo | null> => created)

    const container = renderSkillsCard({ onCreate })

    const newBtn = await vi.waitFor(() => {
      const el = molId(container, 'skill-new')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })

    // No form until the user opts in.
    expect(molId(container, 'skill-create-form')).toBeNull()
    newBtn.click()
    await flush()

    const input = molId(container, 'skill-create-name') as HTMLInputElement
    expect(input, 'the inline name form must open on click').not.toBeNull()
    const submit = molId(container, 'skill-create-submit') as HTMLButtonElement
    // Submit is disabled until a non-blank name is typed.
    expect(submit.disabled).toBe(true)

    await type(input, 'Caching')
    expect(submit.disabled).toBe(false)
    submit.click()
    await flush()

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith('Caching')

    // The created skill appears in the list (no re-fetch needed), and the form closes.
    await vi.waitFor(() => expect(molId(container, 'skill-row-Caching')).not.toBeNull())
    expect(molId(container, 'skill-create-form')).toBeNull()
  })

  it('mounts with the form already open when startCreating is set (bare /newskill)', async () => {
    const container = renderSkillsCard({ onCreate: vi.fn(), startCreating: true })
    await vi.waitFor(() => expect(molId(container, 'skill-create-name')).not.toBeNull())
  })
})

describe('SkillsCard — Load action is a real solid-blue button with no hover tip / native title', () => {
  it('renders Load as a solid primary (blue) button, mounts no tooltip on hover, and never a title', async () => {
    const onLoad = vi.fn()
    const container = renderSkillsCard({ onLoad, onCreate: vi.fn() })

    const load = await vi.waitFor(() => {
      const el = molId(container, 'skill-load-auth')
      expect(el, 'the skill row + Load action must render (not yet loaded)').not.toBeNull()
      return el as HTMLElement
    })

    // The Load button must NOT carry the delayed, touch-blind native title.
    expect(load.hasAttribute('title'), 'Load must not use a native title').toBe(false)

    // It reads as a real SOLID BLUE button: the `solid`/`primary` variant resolves
    // to a filled primary background — NOT the transparent `ghost`/`outline` it
    // used to be (which read as faded text).
    expect(load.className, 'Load must be the solid primary (blue) button').toContain('bg-primary')

    // No styled Tooltip mounts on hover anymore.
    await hover(load.parentElement as HTMLElement)
    expect(
      document.body.querySelector('[role="tooltip"]'),
      'the Load action must have no hover tooltip',
    ).toBeNull()

    // The action still loads the skill.
    load.click()
    await flush()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0]?.[0]).toMatchObject({ path: '.agents/skills/auth/SKILL.md' })
  })

  it('opens the skill when the clickable NAME link is clicked', async () => {
    const onLoad = vi.fn()
    const container = renderSkillsCard({ onLoad, onCreate: vi.fn() })

    const nameLink = (await vi.waitFor(() => {
      const el = molId(container, 'skill-open-auth')
      expect(el, 'the skill name must render as a clickable link').not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    // It is a real <button> reading as the name text (medium weight), not a span.
    expect(nameLink.tagName).toBe('BUTTON')
    expect(nameLink.textContent).toBe('auth')

    nameLink.click()
    await flush()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0]?.[0]).toMatchObject({ path: '.agents/skills/auth/SKILL.md' })
  })
})

describe('SkillsCard — default toggle: hollow vs filled star, aria-label, no tooltip (P5-09)', () => {
  const AUTH_PATH = '.agents/skills/auth/SKILL.md'

  /**
   * Renders the card with a name-distinguishing icon set so the rendered
   * `<path d>` equals the requested glyph name — lets us prove the
   * hollow/filled distinction.
   *
   * @param defaultSkillPaths - The persisted default-loaded set passed to the card.
   * @returns The mount's container.
   */
  function renderWithDefaults(defaultSkillPaths: ReadonlySet<string>): HTMLElement {
    // Each glyph resolves to a single path whose `d` is the icon NAME, so the
    // DOM reveals which star variant rendered (filled `star` vs hollow
    // `star-outline`).
    setIconSet(new Proxy({}, { get: (_t, name) => ({ paths: [{ d: String(name) }] }) }))
    return renderSkillsCard({
      onToggleDefault: () => {},
      defaultSkillPaths,
    })
  }

  it('renders a HOLLOW star (star-outline) with the "Load by default" aria-label and no tooltip when NOT a default', async () => {
    const container = renderWithDefaults(new Set())
    const star = (await vi.waitFor(() => {
      const el = molId(container, 'skill-default-auth')
      expect(el, 'the default toggle must render').not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    expect(star.getAttribute('aria-pressed')).toBe('false')
    expect(star.getAttribute('aria-label')).toBe('Load by default')
    expect(star.hasAttribute('title'), 'the toggle must not use a native title').toBe(false)
    // Hollow glyph: the name-distinguishing icon set renders `d="star-outline"`.
    expect(star.querySelector('svg path')?.getAttribute('d')).toBe('star-outline')

    // No tooltip mounts on hover.
    await hover(star)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('renders a FILLED star (star) with the "Stop loading by default" aria-label when the skill IS a default', async () => {
    const container = renderWithDefaults(new Set([AUTH_PATH]))
    const star = (await vi.waitFor(() => {
      const el = molId(container, 'skill-default-auth')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    expect(star.getAttribute('aria-pressed')).toBe('true')
    expect(star.getAttribute('aria-label')).toBe('Stop loading by default')
    // Filled glyph: `name="star"` (which the molecule icon set maps to `star-fill`).
    expect(star.querySelector('svg path')?.getAttribute('d')).toBe('star')
    // The "Default" badge also surfaces, so a seeded default reads as default on
    // first view without any click.
    expect(molId(container, 'skill-default-badge-auth')).not.toBeNull()
  })

  it('HIDES the Load button and shows the blue "Loaded" pill when the skill is already loaded (default)', async () => {
    const container = renderWithDefaults(new Set([AUTH_PATH]))
    // The row must render (wait on the star toggle, which is always present).
    await vi.waitFor(() => expect(molId(container, 'skill-default-auth')).not.toBeNull())
    // Already loaded into context (default-loaded) → the Load action is done: the
    // right-hand "Load" button is HIDDEN entirely…
    expect(
      molId(container, 'skill-load-auth'),
      'the Load button must be hidden once the skill is loaded',
    ).toBeNull()
    // …and a blue "Loaded" pill surfaces next to the name instead.
    const loadedPill = molId(container, 'skill-loaded-badge-auth')
    expect(loadedPill, 'a blue "Loaded" pill must replace the Load button').not.toBeNull()
    expect(loadedPill?.textContent?.trim()).toBe('Loaded')
    // A default+loaded skill ALSO shows the green "Default" pill (both surface together).
    expect(molId(container, 'skill-default-badge-auth')).not.toBeNull()
  })
})

describe('SkillsCard — "Load all by default" reset affordance (P3-11)', () => {
  it('hides the reset control while the default set is implicit (defaultsExplicit false)', async () => {
    const container = renderSkillsCard({
      onLoad: () => {},
      onToggleDefault: () => {},
      onResetDefault: vi.fn(),
    })
    // Wait for the list to settle, then confirm the reset control is absent: when
    // the set is still the implicit unset→all there is nothing to reset.
    await vi.waitFor(() => expect(molId(container, 'skill-default-auth')).not.toBeNull())
    expect(molId(container, 'skill-reset-defaults')).toBeNull()
  })

  it('hides the reset control when onResetDefault is not provided (even if explicit)', async () => {
    const container = renderSkillsCard({
      onLoad: () => {},
      onToggleDefault: () => {},
      defaultsExplicit: true,
    })
    await vi.waitFor(() => expect(molId(container, 'skill-default-auth')).not.toBeNull())
    expect(molId(container, 'skill-reset-defaults')).toBeNull()
  })

  it('shows the reset control when the set is explicit, labels it, carries no native title / tooltip, and calls onResetDefault', async () => {
    const onResetDefault = vi.fn()
    const container = renderSkillsCard({
      onLoad: () => {},
      onToggleDefault: () => {},
      onResetDefault,
      defaultsExplicit: true,
    })

    const reset = (await vi.waitFor(() => {
      const el = molId(container, 'skill-reset-defaults')
      expect(el, 'the reset control must render when the set is explicit').not.toBeNull()
      return el as HTMLElement
    })) as HTMLButtonElement

    expect(reset.textContent).toContain('Load all by default')
    // Consistent with the row actions (P5-09): no delayed, touch-blind native title.
    expect(reset.hasAttribute('title'), 'the reset control must not use a native title').toBe(false)

    // No styled Tooltip mounts on hover (P5-09 removed row-action tooltips).
    await hover(reset)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()

    reset.click()
    await flush()
    expect(onResetDefault).toHaveBeenCalledTimes(1)
  })
})
