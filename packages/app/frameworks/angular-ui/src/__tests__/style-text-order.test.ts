// @vitest-environment jsdom
/**
 * `styleText` output reaches the element through Angular's `[style]` binding, which keeps its
 * declarations sorted by property name. A shorthand and a longhand it covers whose names sort
 * against the object's order (`gap` then `columnGap`) would then apply in the wrong order: Grid
 * with a caller's `{ gap: '9px', columnGap: '3px' }` drew a 9px column gap where React, and a
 * browser reading the same object, draw 3px. These cases bind the text through a real component.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

import { styleText } from '../utilities/style.js'

/** A component binding one div's `[style]` to its `text`. */
const StyleProbe = Component({
  selector: 'style-probe',
  standalone: true,
  template: '<div [style]="text"></div>',
})(
  class StyleProbeComponent {
    text: string | null = null
  },
)

/** The element's style after Angular binds `style` through `styleText`. */
function bound(style: Record<string, unknown>): CSSStyleDeclaration {
  TestBed.configureTestingModule({
    imports: [StyleProbe],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(StyleProbe)
  ;(fixture.componentInstance as { text: string | null }).text = styleText(style)
  fixture.detectChanges()
  const div = fixture.nativeElement.querySelector('div') as HTMLDivElement
  const out = div.style
  TestBed.resetTestingModule()
  return out
}

/** The element's style after React writes `style` (each key, in object order). */
function react(style: Record<string, string>): CSSStyleDeclaration {
  const div = document.createElement('div')
  for (const [key, value] of Object.entries(style))
    (div.style as unknown as Record<string, string>)[key] = value
  return div.style
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})
afterAll(() => {
  TestBed.resetTestEnvironment()
})

describe('styleText through the [style] binding', () => {
  it.each([
    [
      'a longhand after the shorthand that covers it',
      { gap: '9px', columnGap: '3px' },
      ['row-gap', 'column-gap'],
    ],
    [
      'a shorthand after a longhand it covers',
      { borderTop: '1px solid red', borderColor: 'blue' },
      ['border-top-color', 'border-top-width', 'border-left-color'],
    ],
    [
      'an alignment longhand after place-items',
      { placeItems: 'center', alignItems: 'start' },
      ['align-items', 'justify-items'],
    ],
  ])('applies %s as React does', (_label, style, longhands) => {
    const angular = bound(style)
    const expected = react(style)
    for (const longhand of longhands)
      expect(angular.getPropertyValue(longhand), longhand).toBe(expected.getPropertyValue(longhand))
  })

  it('leaves text whose overlaps already sort in object order as written', () => {
    expect(styleText({ margin: 0, marginTop: 4, color: 'red' })).toBe(
      'margin: 0px; margin-top: 4px; color: red',
    )
    expect(styleText({ gap: 8, padding: '4px 6px' })).toBe('gap: 8px; padding: 4px 6px')
    expect(styleText({ background: 'transparent', backgroundColor: 'red' })).toBe(
      'background: transparent; background-color: red',
    )
  })
})
