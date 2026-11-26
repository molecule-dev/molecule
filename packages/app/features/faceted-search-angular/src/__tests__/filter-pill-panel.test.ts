// @vitest-environment jsdom
/**
 * An open `FilterPill` shows its panel only while its projected content renders something: an
 * empty list (`@for` over no rows) opens no panel, as in React (`slot(children)`).
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Class tokens echo their own name, so the pill renders without a bonded ClassMap; the panel is
// found by its place (the root's second child, after the trigger).
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : (..._args: unknown[]) => String(prop),
      },
    ),
}))

import { FilterPill } from '../filter-pill.component.js'

/** The application a test renders, disposed after it. */
let app: ApplicationRef | null = null

afterEach(() => {
  app?.destroy()
  app = null
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Renders a pill whose projected content is the given template, then opens it.
 *
 * @param content - The template inside the pill; it reads the host's `rows`.
 * @param rows - The rows the host holds.
 * @returns The pill's root element.
 */
async function openPill(content: string, rows: string[]): Promise<HTMLElement> {
  const Host = Component({
    selector: 'mol-pill-panel-content-host',
    standalone: true,
    imports: [FilterPill],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-faceted-search-filter-pill label="Price">${content}</div>`,
  })(
    class PillPanelContentHost {
      rows = rows
    },
  )
  app = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host as Type<{ rows: string[] }>, {
    environmentInjector: app.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  host.setAttribute('data-test-host', '')
  document.body.appendChild(host)
  app.attachView(ref.hostView)
  app.tick()
  const pill = host.querySelector('[mol-faceted-search-filter-pill]') as HTMLElement
  pill.querySelector('button')?.click()
  app.tick()
  expect(pill.querySelector('button')?.getAttribute('aria-expanded')).toBe('true')
  return pill
}

/** A list of the host's rows. */
const LIST = '@for (row of rows; track row) {<span>{{ row }}</span>}'

describe('FilterPill panel', () => {
  it.each([
    ['an empty list', LIST],
    ['a list of nothing', '@if (rows.length) {<span>never</span>}'],
  ])('an open pill whose children render nothing shows no panel (%s)', async (_name, content) => {
    const pill = await openPill(content, [])
    expect(pill.children).toHaveLength(1)
  })

  it('an open pill whose children render something shows them in its panel', async () => {
    const pill = await openPill(LIST, ['One', 'Two'])
    expect(pill.children).toHaveLength(2)
    expect(pill.children[1]?.textContent).toBe('OneTwo')
  })
})
