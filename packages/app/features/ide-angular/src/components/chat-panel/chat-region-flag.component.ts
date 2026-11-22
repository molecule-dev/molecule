/**
 * A model-region flag drawn from the bonded country-flag set — Angular
 * counterpart of `@molecule/app-ide-react`'s `RegionFlag` (that file's design
 * notes apply): the same inputs (React prop names), the same DOM for the same
 * input.
 *
 * The host IS React's root `<span>`. A bonded flag renders the set's own SVG
 * markup with width/height injected from the requested total height (border
 * included) and the flag's aspect ratio; an unbonded set or an unknown code
 * renders the uppercase code as text. Injecting the set's markup verbatim is
 * the same trust boundary React uses with `dangerouslySetInnerHTML` (the set is
 * a build-time dependency, never user input).
 *
 * @module
 */

import { Component, inject } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'

import { type CountryFlagData, getCountryFlag } from '@molecule/app-country-flags'
import { styleText } from '@molecule/app-ui-angular'

/** The flag wrapper's inline style (constant for every flag). */
const FLAG_STYLE = styleText({
  display: 'inline-flex',
  border: '1px solid rgba(128,128,128,0.4)',
  borderRadius: 1,
  overflow: 'hidden',
})

/**
 * Escapes a region code for the textual-fallback branch, so the `[innerHTML]`
 * binding produces a TEXT node exactly as React's `{code.toUpperCase()}` does.
 *
 * @param value - The uppercase region code.
 * @returns The HTML-escaped text.
 */
function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Renders a region's rectangular flag from the bonded country-flag set at the
 * given total height, falling back to the uppercase code as text when no flag
 * set is bonded or the code has no flag.
 */
@Component({
  selector: 'span[mol-region-flag]',
  standalone: true,
  inputs: ['code', 'height'],
  host: {
    '[attr.aria-hidden]': 'flag() ? "true" : null',
    '[attr.style]': 'hostStyle()',
    '[innerHTML]': 'hostHtml()',
  },
  template: '',
})
export class ChatRegionFlag {
  /** The ISO/pseudo country code to draw (e.g. `US`, `CN`). */
  code = ''

  /** The flag's total height in pixels, border included (React's `height`). */
  height = 14

  /** Sanitizer for the trusted flag artwork and the escaped text fallback. */
  private readonly sanitizer = inject(DomSanitizer)

  /**
   * The flag record for the current code, or `undefined` when none is bonded.
   *
   * @returns The flag data, or `undefined`.
   */
  private flag(): CountryFlagData | undefined {
    return getCountryFlag(this.code)
  }

  /**
   * The host's inline style: the wrapper chrome for a flag, or the small text
   * treatment for the fallback.
   *
   * @returns The `style` attribute text.
   */
  protected hostStyle(): string | null {
    if (!this.flag()) {
      return styleText({ fontSize: '10px', lineHeight: `${this.height}px` })
    }
    return FLAG_STYLE
  }

  /**
   * The host's content: the flag's SVG with its dimensions injected, or the
   * escaped uppercase code as text.
   *
   * @returns The trusted markup for the span.
   */
  protected hostHtml(): SafeHtml {
    const flag = this.flag()
    if (!flag) {
      return this.sanitizer.bypassSecurityTrustHtml(escapeText(this.code.toUpperCase()))
    }
    const innerHeight = this.height - 2
    const innerWidth = Math.round(innerHeight * flag.aspectRatio)
    const svg = flag.svg.replace(
      '<svg',
      `<svg width="${innerWidth}" height="${innerHeight}" style="display:block"`,
    )
    return this.sanitizer.bypassSecurityTrustHtml(svg)
  }
}
