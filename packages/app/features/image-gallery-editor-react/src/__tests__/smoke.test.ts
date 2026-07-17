import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// cm mock: every token resolves to its OWN NAME, so the rendered markup lets us
// assert both (a) real `cm.*` tokens are used and (b) NO raw Tailwind / M3
// literal (`hidden`, `bg-surface-container-low`, `col-span-8`, `tracking-widest`,
// …) survived the migration — those never generate without an @source scan of
// this package and were the root cause of the visible raw file input.
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
// glyphs, not a raw `material-symbols-outlined` font ligature span.
vi.mock('@molecule/app-ui-react', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) =>
    createElement('i', { 'data-icon': name, className }),
}))

const { ImageGalleryEditor } = await import('../ImageGalleryEditor.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('ImageGalleryEditor', () => {
  const baseSlots: (string | null)[] = [null, 'https://img/1.png', null]

  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod.ImageGalleryEditor).toBe('function')
  })

  it('hides the file input via a real display:none style, not a raw `hidden` class', () => {
    const markup = html(createElement(ImageGalleryEditor, { slots: baseSlots, onChange: () => {} }))
    const input = markup.match(/<input[^>]*type="file"[^>]*>/)?.[0] ?? ''
    expect(input).not.toBe('')
    // Inline display:none actually hides it out of the box (generates nothing).
    expect(input).toMatch(/style="[^"]*display:\s*none/)
    // ...and NOT the raw `hidden` utility that never generated in a scaffold.
    expect(input).not.toMatch(/class="[^"]*\bhidden\b/)
  })

  it('styles every element through cm.* tokens — no raw Tailwind/M3 literals', () => {
    const markup = html(
      createElement(ImageGalleryEditor, {
        slots: baseSlots,
        onChange: () => {},
        counter: '1 / 3',
        statusMessage: 'Uploading',
      }),
    )
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
    const markup = html(
      createElement(ImageGalleryEditor, {
        slots: ['https://img/1.png', null],
        onChange: () => {},
      }),
    )
    expect(markup).toContain('data-icon="upload"') // drop zone
    expect(markup).toContain('data-icon="trash"') // filled-slot delete affordance
    expect(markup).toContain('data-icon="image"') // empty slot (default emptySlotIcon)
  })

  it('honors a custom emptySlotIcon', () => {
    const markup = html(
      createElement(ImageGalleryEditor, {
        slots: [null],
        onChange: () => {},
        emptySlotIcon: 'star',
      }),
    )
    expect(markup).toContain('data-icon="star"')
  })

  it('renders header, counter and status message content', () => {
    const markup = html(
      createElement(ImageGalleryEditor, {
        slots: [null],
        onChange: () => {},
        counter: '0 / 24',
        statusMessage: 'Saved',
      }),
    )
    expect(markup).toContain('0 / 24')
    expect(markup).toContain('Saved')
    expect(markup).toContain('data-mol-id="image-gallery-editor-status"')
  })
})
