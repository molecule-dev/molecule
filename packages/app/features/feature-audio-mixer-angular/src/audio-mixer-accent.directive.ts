/**
 * Accent-border directive of the Angular channel-strip mixer (React parity).
 *
 * @module
 */

import { Directive, ElementRef, inject, type OnChanges } from '@angular/core'

/**
 * Applies React's `borderTop: color ? `3px solid ${color}` : undefined` to the
 * channel header strip. React sets an inline style through the CSSOM, so the
 * shorthand is parsed and canonicalized (`3px solid rgb(…)`); assigning the
 * style property here does the same, and an absent color clears it completely.
 */
@Directive({
  selector: '[molAudioMixerAccent]',
  standalone: true,
  inputs: ['molAudioMixerAccent'],
})
export class AudioMixerAccent implements OnChanges {
  /** The channel's accent color, or null/undefined for none. */
  molAudioMixerAccent?: string | null

  /** The header element the directive sits on. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Re-applies the border whenever the accent color changes. */
  ngOnChanges(): void {
    const color = this.molAudioMixerAccent
    this.host.nativeElement.style.borderTop = color ? `3px solid ${color}` : ''
  }
}
