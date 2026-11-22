// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ImageGalleryEditor` — a port of
 * `@molecule/app-image-gallery-editor-react/src/__tests__/smoke.test.ts`:
 * the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// cm mock: every token resolves to its OWN NAME, so the rendered markup lets us
// assert both (a) real `cm.*` tokens are used and (b) NO raw Tailwind / M3
// literal survived — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        return (..._args: unknown[]) => String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

// Icon mock: record the glyph name — proves the editor renders real SVG <Icon>
// glyphs, not a raw font ligature span. ConfirmDialog shows its title while
// open. (The mocked cm values are functions, so a function class token is
// called, the way the mock's own `cn` unwraps one.)
vi.mock('@molecule/app-ui-solid', () => ({
  Icon: (props: { name: string; className?: unknown }) => {
    const className = typeof props.className === 'function' ? props.className() : props.className
    return <i data-icon={props.name} class={className} />
  },
  // The conditional stays inside the JSX: a Solid component body runs once,
  // so a body-level ternary would freeze on the first `open` value.
  ConfirmDialog: (props: { open?: boolean; title?: unknown }) => (
    <>{props.open ? <div data-confirm-dialog="">{String(props.title ?? '')}</div> : null}</>
  ),
}))

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string) => `«${key}»`,
  }),
}))

import type { ImageGalleryEditorProps } from '../types.js'

const { ImageGalleryEditor } = await import('../ImageGalleryEditor.jsx')
const { render } = await import('solid-js/web')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders with Solid's browser renderer, over `slots` and a no-op `onChange`. */
function html(
  props: Pick<ImageGalleryEditorProps, 'onChange' | 'slots'> &
    Partial<Omit<ImageGalleryEditorProps, 'onChange' | 'slots'>>,
): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <ImageGalleryEditor {...props} />, container))
  const markup = container.innerHTML
  return markup
}

describe('ImageGalleryEditor', () => {
  const baseSlots: (string | null)[] = [null, 'https://img/1.png', null]

  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod.ImageGalleryEditor).toBe('function')
  })

  it('hides the file input via a real display:none style, not a raw `hidden` class', () => {
    const markup = html({ slots: baseSlots, onChange: () => {} })
    const input = markup.match(/<input[^>]*type="file"[^>]*>/)?.[0] ?? ''
    expect(input).not.toBe('')
    // Inline display:none actually hides it out of the box (generates nothing).
    expect(input).toMatch(/style="[^"]*display:\s*none/)
    // ...and NOT the raw `hidden` utility that never generated in a scaffold.
    expect(input).not.toMatch(/class="[^"]*\bhidden\b/)
  })

  it('styles every element through cm.* tokens — no raw Tailwind/M3 literals', () => {
    const markup = html({
      slots: baseSlots,
      onChange: () => {},
      counter: '1 / 3',
      statusMessage: 'Uploading',
    })
    // Real cm tokens present (the mock echoes each token name into className).
    expect(markup).toContain('surfaceSecondary')
    expect(markup).toContain('grid')
    expect(markup).toContain('flex')
    expect(markup).toContain('trackingWide') // cm.trackingWide, not raw `tracking-widest`
    // None of the raw M3 / Tailwind literals a plain scaffold never @source-scans.
    for (const raw of [
      'bg-surface-container',
      'col-span-',
      'aspect-[',
      'rounded-xl',
      'border-outline-variant',
      'border-dashed',
      'text-on-surface',
      'text-stone-',
      'text-secondary',
      'font-headline',
      'material-symbols',
      'group-hover',
      'tracking-widest',
      'object-cover',
    ]) {
      expect(markup).not.toContain(raw)
    }
  })

  it('renders real SVG Icon glyphs (upload / trash / image), not font ligatures', () => {
    const markup = html({ slots: ['https://img/1.png', null], onChange: () => {} })
    expect(markup).toContain('data-icon="upload"') // drop zone
    expect(markup).toContain('data-icon="trash"') // filled-slot delete affordance
    expect(markup).toContain('data-icon="image"') // empty slot (default emptySlotIcon)
  })

  it('honors a custom emptySlotIcon', () => {
    const markup = html({ slots: [null], onChange: () => {}, emptySlotIcon: 'star' })
    expect(markup).toContain('data-icon="star"')
  })

  it('renders header, counter and status message content', () => {
    const markup = html({
      slots: [null],
      onChange: () => {},
      counter: '0 / 24',
      statusMessage: 'Saved',
    })
    expect(markup).toContain('0 / 24')
    expect(markup).toContain('Saved')
    expect(markup).toContain('data-mol-id="image-gallery-editor-status"')
  })
})
