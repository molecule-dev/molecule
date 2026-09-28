import { describe, expect, it } from 'vitest'

import { moleculeSpinnerMarkSvg } from '../spinner.js'

describe('moleculeSpinnerMarkSvg', () => {
  it('emits the shipped design by default (timings, glints, flow)', () => {
    const svg = moleculeSpinnerMarkSvg()
    expect(svg).toContain('dur="2.5s"')
    expect(svg).toContain('dur="5s"')
    expect(svg).toContain('values="0 0; 32 0" dur="3s"')
    // one glint animate per atom, keyed to that atom's swap windows
    expect(svg).toContain('keyTimes="0;0.033;0.1;0.167;1"')
    expect(svg).toContain('keyTimes="0;0.367;0.434;0.5;0.7;0.767;0.833;1"')
    expect(svg).toContain('keyTimes="0;0.7;0.767;0.833;1"')
  })

  it('references the given gradient id from every gradient consumer', () => {
    const svg = moleculeSpinnerMarkSvg({ gradientId: 'unique-1' })
    expect(svg).toContain('id="unique-1"')
    for (let i = 0; i < 4; i++) {
      expect(svg).toContain(`id="unique-1-a${i}"`)
      expect(svg).toContain(`stroke="url(#unique-1-a${i})"`)
    }
    expect(svg.match(/url\(#unique-1\)/g)?.length).toBe(1)
  })

  it('mono paint drops defs and url() references for currentColor', () => {
    const svg = moleculeSpinnerMarkSvg({ paint: 'mono' })
    expect(svg).not.toContain('<defs')
    expect(svg).not.toContain('url(#')
    expect(svg).toContain('stroke="currentColor"')
    // atoms inherit the group stroke instead of carrying their own
    expect(svg).not.toMatch(/<circle[^>]*stroke=/)
  })

  it('bakes size into width/height, or omits both for CSS-sized uses', () => {
    expect(moleculeSpinnerMarkSvg({ size: 16 })).toMatch(/<svg[^>]* width="16" height="16"/)
    const css = moleculeSpinnerMarkSvg()
    expect(css).not.toMatch(/<svg[^>]* (width|height)=/)
  })

  it('switches a11y shape on ariaLabel and never emits both', () => {
    const labeled = moleculeSpinnerMarkSvg({ ariaLabel: 'Loading' })
    expect(labeled).toContain('role="status" aria-label="Loading"')
    expect(labeled).not.toContain('aria-hidden')
    const hidden = moleculeSpinnerMarkSvg()
    expect(hidden).toContain('aria-hidden="true"')
    expect(hidden).not.toContain('role=')
  })

  it('escapes free text in ariaLabel', () => {
    const svg = moleculeSpinnerMarkSvg({ ariaLabel: 'Loading "stuff" & <things>' })
    expect(svg).toContain('aria-label="Loading &quot;stuff&quot; &amp; &lt;things&gt;"')
  })

  it('passes colors through verbatim (vars for in-app, hexes for third-party pages)', () => {
    const hexes = moleculeSpinnerMarkSvg({
      colors: { blue: '#185eff', light: '#487dfb', peach: '#dc9152' },
    })
    expect(hexes).toContain('stop-color="#185eff"')
    expect(hexes).toContain('stop-color="#dc9152"')
    expect(moleculeSpinnerMarkSvg()).toContain('var(--mol-spin-blue, #4f86f0)')
  })

  it('never animates stop-COLOR and never puts var() inside an animate values list (the 1.3.0 flat-gradient bug)', () => {
    const svg = moleculeSpinnerMarkSvg()
    const animates = svg.match(/<animate [^>]*>/g) ?? []
    expect(animates.length).toBeGreaterThanOrEqual(15)
    for (const a of animates) {
      const attr = /attributeName="([^"]+)"/.exec(a)?.[1]
      expect(attr).not.toBe('stop-color')
      const values = /values="([^"]+)"/.exec(a)?.[1] ?? ''
      expect(values).not.toContain('var(')
    }
    // the glint is a peach overlay circle whose ELEMENT opacity ignites
    expect(svg).not.toContain('<animate attributeName="stop-color"')
    expect(svg).not.toContain('<animate attributeName="stop-opacity"')
    expect(svg).toContain('values="0;0;1;0;0"')
  })

  it('keeps every BASE gradient stop fully opaque — no edge shows the background through (the 1.3.1 transparent-rim bug)', () => {
    const svg = moleculeSpinnerMarkSvg()
    // base gradients (-a*) carry no stop-opacity at all; only the overlay
    // tail (-g*) has one, and it sits on a second circle stacked over an
    // opaque base, never alone.
    for (const m of svg.matchAll(
      /<linearGradient id="[^"]*-a\d+"[^>]*>([\s\S]*?)<\/linearGradient>/g,
    )) {
      expect(m[1]).not.toContain('stop-opacity')
    }
    const circles = svg.match(/<circle [^>]*>/g) ?? []
    expect(circles).toHaveLength(8) // base + glint overlay per atom
    const overlayStrokes = circles.filter((c) => /-g\d+\)"/.test(c))
    expect(overlayStrokes).toHaveLength(4)
    // the overlay carries the glint opacity animate with the swap keyTimes
    const overlayCircle =
      svg.match(/<circle [^>]*stroke="url\([^"]*-g0\)"[\s\S]*?<\/circle>/)?.[0] ?? ''
    expect(overlayCircle).toContain('<animate attributeName="opacity"')
    expect(overlayCircle).toContain('keyTimes="0;0.033;0.1;0.167;1"')
  })

  it('carries className, style and the hub-centering glyph matrix', () => {
    const svg = moleculeSpinnerMarkSvg({ className: 'mol-badge-mark', style: 'color:red' })
    expect(svg).toContain('class="mol-badge-mark"')
    expect(svg).toContain('style="color:red"')
    // x-translate -.78879 puts the hub on (16,16); the favicon uses .81594
    expect(svg).toContain('matrix(.86229 0 0 .86229 -.78879 2.2034)')
  })

  it('honors timing overrides', () => {
    const svg = moleculeSpinnerMarkSvg({ timings: { dur: '1.5s', spin: '3s', flow: '2s' } })
    expect(svg).toContain('dur="1.5s"')
    expect(svg).toContain('dur="3s"')
    expect(svg).toContain('dur="2s"')
    expect(svg).not.toContain('dur="2.5s"')
    expect(svg).not.toContain('dur="5s"')
  })

  it('emits no single quotes for badge-shaped uses (the badge embeds it in a single-quoted JS string)', () => {
    const svg = moleculeSpinnerMarkSvg({
      gradientId: 'mol-badge-grad',
      className: 'mol-badge-mark',
      colors: { blue: '#4f86f0', light: '#6e9bf5', peach: '#e0975a' },
    })
    expect(svg).not.toContain("'")
  })
})
