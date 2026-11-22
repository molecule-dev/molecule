// @vitest-environment jsdom

/**
 * SYN4 + P5-08/P5-09 — the `/skills` browser's skill-authoring affordance and the
 * polished per-row actions render to the rule-11 bar.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/SkillsCard.test.tsx` with the
 * same test names and the same behavioral assertions, mounted the way the
 * conformance kit mounts the card (a JIT host whose template binds every input).
 * The audit found the skill-authoring half of `/skills` entirely unbuilt; the
 * P5 polish pass then fixed the row actions (a stray "+" glyph on "New skill", a
 * Load button that read as faded text, an opacity-faded star that never read as
 * a real default, and hover tooltips nobody needed). This is a real jsdom render
 * of `SkillsCard` (not a source grep), using the REAL `@molecule/app-ui-tailwind`
 * ClassMap so resolved classes are actual theme tokens. It pins:
 *
 * - a "New skill" affordance that is a PLAIN TEXT button — no leading "+" glyph
 *   (neither an `<svg>` icon nor a unicode char) — gated on `onCreate`;
 * - clicking it opens an inline name form whose submit calls `onCreate`, and the
 *   created skill is added to the list without a re-fetch;
 * - mounting with `startCreating` opens that form immediately (the bare
 *   `/newskill` path);
 * - the skill NAME is a clickable link (`skill-open-<name>`) that opens the skill;
 * - the per-row **Load** action is a real solid-blue (`solid`/`primary`) button —
 *   NOT faded ghost/outline text — with NO hover tooltip and NO native `title`,
 *   and is HIDDEN once the skill is loaded (a blue "Loaded" pill replaces it);
 * - the per-row default toggle is a star `Icon` that is FILLED (`star`) for a
 *   default skill and HOLLOW (`star-outline`) otherwise, carries an `aria-label`,
 *   and has NO hover tooltip.
 *
 * Every assertion fails if the polish is reverted (the "+" returns, Load goes
 * back to ghost/title, the star reverts to the opacity trick, or a tooltip
 * reappears on a row action).
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideHttp, provideI18n } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SkillsCard } from '../parts/skills-card.component.js'

const PROJECT_ID = 'p1'
const AUTH_PATH = '.agents/skills/auth/SKILL.md'
const AUTH_SKILL_CONTENT = [
  '---',
  'name: auth',
  'description: Authentication, login, OAuth and sessions.',
  '---',
  '',
  '# auth',
].join('\n')

/** The JIT host: its template binds every input, so each prop reaches the card. */
const SkillsCardHost = Component({
  selector: 'mol-skills-card-host',
  standalone: true,
  imports: [SkillsCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-skills-card [projectId]="p['projectId']" [initialQuery]="p['initialQuery']" [onLoad]="p['onLoad']" [onCreate]="p['onCreate']" [startCreating]="p['startCreating']" [loadedSkillPaths]="p['loadedSkillPaths']" [defaultSkillPaths]="p['defaultSkillPaths']" [onToggleDefault]="p['onToggleDefault']" [onResetDefault]="p['onResetDefault']" [defaultsExplicit]="p['defaultsExplicit']" [isLight]="p['isLight']" [embedded]="p['embedded']"></div>`,
})(
  class SkillsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted card and its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof SkillsCardHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

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
      if (url.endsWith('/files-list')) return ok({ files: [AUTH_PATH] })
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
 * Runs Angular's change detection (and lets queued promises/timers settle).
 *
 * @returns A promise that settles after the tick.
 */
async function tick(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Polls until `find` returns an element (the React suite's `waitFor`).
 *
 * @param find - Locates the element, or returns `null` while it is absent.
 * @param message - The failure text when it never appears.
 * @returns The found element.
 */
async function waitFor<T extends Element>(find: () => T | null, message: string): Promise<T> {
  for (let i = 0; i < 200; i++) {
    const el = find()
    if (el) return el
    await tick()
  }
  throw new Error(message)
}

/**
 * Mounts the card with the given props over the READY listing.
 *
 * @param props - Props to override the defaults with.
 * @returns The live mount.
 */
async function renderCard(props: Record<string, unknown> = {}): Promise<Mounted> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideI18n(createSimpleI18nProvider('en')),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof SkillsCardHost>> = createComponent(SkillsCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    projectId: PROJECT_ID,
    initialQuery: '',
    onLoad: () => {},
    isLight: false,
    ...props,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await tick()
  return current
}

/** Finds an element by its `data-mol-id`. */
const byId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Types like a user: the value, then a bubbling `input` event.
 *
 * @param input - The field.
 * @param value - The new value.
 * @returns A promise that settles after the change.
 */
async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await tick()
}

/**
 * Hovers like a user — every enter event a tooltip could listen for.
 *
 * @param el - The element to hover.
 * @returns A promise that settles after the change.
 */
async function hover(el: HTMLElement | null): Promise<void> {
  el?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el?.dispatchEvent(new MouseEvent('mouseenter'))
  await tick()
}

/**
 * Leaves like a user — the matching leave events.
 *
 * @param el - The element to leave.
 * @returns A promise that settles after the change.
 */
async function unhover(el: HTMLElement | null): Promise<void> {
  el?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  el?.dispatchEvent(new MouseEvent('mouseleave'))
  await tick()
}

beforeEach(() => {
  // The REAL themed ClassMap so resolved classes are actual theme tokens.
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon still renders a real <svg>.
  setIconSet(
    new Proxy(
      {},
      {
        get: () => ({ paths: [], viewBox: '0 0 16 16' }),
      },
    ),
  )
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
})

describe('SkillsCard — skill authoring (SYN4)', () => {
  it('renders the "New skill" affordance as a plain text button with no leading "+" glyph', async () => {
    const { container } = await renderCard({ onCreate: vi.fn() })
    const newBtn = await waitFor(
      () => byId(container, 'skill-new'),
      'the "New skill" affordance must render',
    )
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
    const { container } = await renderCard()
    // Wait for the list to settle, then confirm the affordance is absent.
    await waitFor(() => byId(container, 'skill-load-auth'), 'the row must settle')
    expect(byId(container, 'skill-new')).toBeNull()
  })

  it('opens the inline form, submits the name to onCreate, and lists the new skill', async () => {
    const created: SkillInfo = {
      path: '.agents/skills/caching/SKILL.md',
      name: 'Caching',
      description: 'When and how to cache.',
    }
    const onCreate = vi.fn(async (_name: string): Promise<SkillInfo | null> => created)

    const { container } = await renderCard({ onCreate })

    const newBtn = await waitFor(
      () => byId(container, 'skill-new'),
      'the "New skill" affordance must render',
    )

    // No form until the user opts in.
    expect(byId(container, 'skill-create-form')).toBeNull()
    newBtn.click()
    await tick()

    const input = byId(container, 'skill-create-name') as HTMLInputElement | null
    expect(input, 'the inline name form must open on click').not.toBeNull()
    const submit = byId(container, 'skill-create-submit') as HTMLButtonElement
    // Submit is disabled until a non-blank name is typed.
    expect(submit.disabled).toBe(true)

    await type(input as HTMLInputElement, 'Caching')
    expect(submit.disabled).toBe(false)
    submit.click()
    await tick()

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith('Caching')

    // The created skill appears in the list (no re-fetch needed), and the form closes.
    await waitFor(
      () => byId(container, 'skill-row-Caching'),
      'the created skill must join the list',
    )
    expect(byId(container, 'skill-create-form')).toBeNull()
  })

  it('mounts with the form already open when startCreating is set (bare /newskill)', async () => {
    const { container } = await renderCard({ onCreate: vi.fn(), startCreating: true })
    await waitFor(() => byId(container, 'skill-create-name'), 'the form must be open on mount')
  })
})

describe('SkillsCard — Load action is a real solid-blue button with no hover tip / native title', () => {
  it('renders Load as a solid primary (blue) button, mounts no tooltip on hover, and never a title', async () => {
    const onLoad = vi.fn()
    const { container } = await renderCard({ onLoad, onCreate: vi.fn() })

    const load = await waitFor(
      () => byId(container, 'skill-load-auth'),
      'the skill row + Load action must render (not yet loaded)',
    )

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
    await unhover(load.parentElement as HTMLElement)

    // The action still loads the skill.
    load.click()
    await tick()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0][0]).toMatchObject({ path: AUTH_PATH })
  })

  it('opens the skill when the clickable NAME link is clicked', async () => {
    const onLoad = vi.fn()
    const { container } = await renderCard({ onLoad, onCreate: vi.fn() })

    const nameLink = (await waitFor(
      () => byId(container, 'skill-open-auth'),
      'the skill name must render as a clickable link',
    )) as HTMLButtonElement

    // It is a real <button> reading as the name text (medium weight), not a span.
    expect(nameLink.tagName).toBe('BUTTON')
    expect(nameLink.textContent).toBe('auth')

    nameLink.click()
    await tick()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0][0]).toMatchObject({ path: AUTH_PATH })
  })
})

describe('SkillsCard — default toggle: hollow vs filled star, aria-label, no tooltip (P5-09)', () => {
  /**
   * Renders the card with a name-distinguishing icon set so the rendered `<path d>`
   * equals the requested glyph name — lets us prove the hollow/filled distinction.
   *
   * @param defaultSkillPaths - The persisted default-loaded set passed to the card.
   * @returns The render result's `container`.
   */
  async function renderWithDefaults(defaultSkillPaths: ReadonlySet<string>): Promise<HTMLElement> {
    // Each glyph resolves to a single path whose `d` is the icon NAME, so the DOM
    // reveals which star variant rendered (filled `star` vs hollow `star-outline`).
    setIconSet(
      new Proxy(
        {},
        {
          get: (_target, name) => ({
            paths: [{ d: String(name) }],
            viewBox: '0 0 16 16',
          }),
        },
      ),
    )
    const { container } = await renderCard({
      onToggleDefault: () => {},
      defaultSkillPaths,
    })
    return container
  }

  it('renders a HOLLOW star (star-outline) with the "Load by default" aria-label and no tooltip when NOT a default', async () => {
    const container = await renderWithDefaults(new Set())
    const star = (await waitFor(
      () => byId(container, 'skill-default-auth'),
      'the default toggle must render',
    )) as HTMLButtonElement

    expect(star.getAttribute('aria-pressed')).toBe('false')
    expect(star.getAttribute('aria-label')).toBe('Load by default')
    expect(star.hasAttribute('title'), 'the toggle must not use a native title').toBe(false)
    // Hollow glyph: the name-distinguishing icon set renders `d="star-outline"`.
    expect(star.querySelector('svg path')?.getAttribute('d')).toBe('star-outline')

    // No tooltip mounts on hover.
    await hover(star)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    await unhover(star)
  })

  it('renders a FILLED star (star) with the "Stop loading by default" aria-label when the skill IS a default', async () => {
    const container = await renderWithDefaults(new Set([AUTH_PATH]))
    const star = (await waitFor(
      () => byId(container, 'skill-default-auth'),
      'the default toggle must render',
    )) as HTMLButtonElement

    expect(star.getAttribute('aria-pressed')).toBe('true')
    expect(star.getAttribute('aria-label')).toBe('Stop loading by default')
    // Filled glyph: `name="star"` (which the molecule icon set maps to `star-fill`).
    expect(star.querySelector('svg path')?.getAttribute('d')).toBe('star')
    // The "Default" badge also surfaces, so a seeded default reads as default on
    // first view without any click.
    expect(byId(container, 'skill-default-badge-auth')).not.toBeNull()
  })

  it('HIDES the Load button and shows the blue "Loaded" pill when the skill is already loaded (default)', async () => {
    const container = await renderWithDefaults(new Set([AUTH_PATH]))
    // The row must render (wait on the star toggle, which is always present).
    await waitFor(() => byId(container, 'skill-default-auth'), 'the row must render')
    // Already loaded into context (default-loaded) → the Load action is done: the
    // right-hand "Load" button is HIDDEN entirely…
    expect(
      byId(container, 'skill-load-auth'),
      'the Load button must be hidden once the skill is loaded',
    ).toBeNull()
    // …and a blue "Loaded" pill surfaces next to the name instead.
    const loadedPill = byId(container, 'skill-loaded-badge-auth')
    expect(loadedPill, 'a blue "Loaded" pill must replace the Load button').not.toBeNull()
    expect(loadedPill?.textContent?.trim()).toBe('Loaded')
    // A default+loaded skill ALSO shows the green "Default" pill (both surface together).
    expect(byId(container, 'skill-default-badge-auth')).not.toBeNull()
  })
})

describe('SkillsCard — "Load all by default" reset affordance (P3-11)', () => {
  it('hides the reset control while the default set is implicit (defaultsExplicit false)', async () => {
    const { container } = await renderCard({
      onToggleDefault: () => {},
      onResetDefault: vi.fn(),
    })
    // Wait for the list to settle, then confirm the reset control is absent: when
    // the set is still the implicit unset→all there is nothing to reset.
    await waitFor(() => byId(container, 'skill-default-auth'), 'the row must settle')
    expect(byId(container, 'skill-reset-defaults')).toBeNull()
  })

  it('hides the reset control when onResetDefault is not provided (even if explicit)', async () => {
    const { container } = await renderCard({
      onToggleDefault: () => {},
      defaultsExplicit: true,
    })
    await waitFor(() => byId(container, 'skill-default-auth'), 'the row must settle')
    expect(byId(container, 'skill-reset-defaults')).toBeNull()
  })

  it('shows the reset control when the set is explicit, labels it, carries no native title / tooltip, and calls onResetDefault', async () => {
    const onResetDefault = vi.fn()
    const { container } = await renderCard({
      onToggleDefault: () => {},
      onResetDefault,
      defaultsExplicit: true,
    })

    const reset = (await waitFor(
      () => byId(container, 'skill-reset-defaults'),
      'the reset control must render when the set is explicit',
    )) as HTMLButtonElement

    expect(reset.textContent).toContain('Load all by default')
    // Consistent with the row actions (P5-09): no delayed, touch-blind native title.
    expect(reset.hasAttribute('title'), 'the reset control must not use a native title').toBe(false)

    // No styled Tooltip mounts on hover (P5-09 removed row-action tooltips).
    await hover(reset)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    await unhover(reset)

    reset.click()
    await tick()
    expect(onResetDefault).toHaveBeenCalledTimes(1)
  })
})
