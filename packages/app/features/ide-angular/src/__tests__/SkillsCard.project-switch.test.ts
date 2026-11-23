// @vitest-environment jsdom
/**
 * `SkillsCard`'s project switch — a port of
 * `@molecule/app-ide-react/src/__tests__/SkillsCard.project-switch.test.tsx`
 * with the same test name and the same behavioral assertions, mounted through
 * Angular's own `createApplication` under an http/i18n provider.
 *
 * `SkillsCard` is mounted with one `projectId` and can be re-pointed at another
 * without a remount (the IDE reuses the card). The card resets to its loading
 * state in the render that carries the new project id, so the previous
 * project's skills are never painted under the new one — this test pins that
 * reset and the reload that follows it.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideHttp, provideI18n } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { SkillsCard } from '../parts/skills-card.component.js'

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
    config: { method: 'GET', url: '' },
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
 * The JIT host the way the conformance kit mounts the card: its template binds
 * every input.
 */
const SkillsCardHost = Component({
  selector: 'mol-skills-card-host',
  standalone: true,
  imports: [SkillsCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-skills-card [projectId]="p['projectId']" [initialQuery]="p['initialQuery']" [onLoad]="p['onLoad']" [isLight]="p['isLight']"></div>`,
})(
  class SkillsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted card, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof SkillsCardHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Mounts the card for one project.
 *
 * @param projectId - The project whose skills the card lists.
 * @returns The mount.
 */
async function renderCard(projectId: string): Promise<Mounted> {
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
      provideDomPlacement(),
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
    projectId,
    initialQuery: '',
    onLoad: () => {},
    isLight: true,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

/**
 * Re-points the card at another project, as React's `rerender` does.
 *
 * @param mounted - The mount.
 * @param projectId - The new project id.
 */
async function setProject(mounted: Mounted, projectId: string): Promise<void> {
  mounted.ref.instance.p = {
    projectId,
    initialQuery: '',
    onLoad: () => {},
    isLight: true,
  }
  mounted.ref.changeDetectorRef.markForCheck()
  mounted.appRef.tick()
}

describe('SkillsCard project switch', () => {
  it('drops the previous project’s skills and reloads when the project id changes', async () => {
    const mounted = await renderCard('p1')
    const { container } = mounted
    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="skill-open-p1only"]')) break
      await flush()
    }
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).not.toBeNull()

    await setProject(mounted, 'p2')

    // The render carrying the new project id already reports loading, so p1's
    // skill is not painted under p2.
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
    expect(container.textContent).toContain('Loading skills')

    for (let i = 0; i < 20; i++) {
      if (container.querySelector('[data-mol-id="skill-open-p2only"]')) break
      await flush()
    }
    expect(container.querySelector('[data-mol-id="skill-open-p2only"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="skill-open-p1only"]')).toBeNull()
  })
})
