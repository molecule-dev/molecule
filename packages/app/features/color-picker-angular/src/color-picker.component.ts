/**
 * ColorPicker component (React parity).
 *
 * @module
 */

import { type AfterViewChecked, Component, ElementRef, inject } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from './conversions.js'
import type { ColorPickerProps, HsvColor, RgbColor } from './types.js'

/** One RGB channel key. */
type Channel = 'r' | 'g' | 'b'

/**
 * ColorPicker component.
 *
 * Controlled color picker — HSV (hue + saturation + value) sliders, RGB
 * sliders, and a HEX text input. All four representations stay in lockstep
 * with the controlling `value`.
 *
 * Designed for design canvases, photo editors, animation tools, and brand
 * editors. Pure UI — no popover/anchor logic; parents render this inside
 * whatever portal/popover they prefer.
 *
 * The host IS the outer `<div>` (`div[mol-color-picker]`), matching React's
 * root exactly. Styling is delegated to `getClassMap()`; only inline styles
 * are used for the live swatch background and slider track gradients.
 *
 * Text is read through the binding's reactive `useTranslation()`, so a locale
 * switch re-renders the translated `aria-label`s.
 */
@Component({
  selector: 'div[mol-color-picker]',
  standalone: true,
  inputs: ['value', 'onChange', 'dataMolId', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': "dataMolId ?? 'color-picker'",
    role: 'group',
    '[attr.aria-label]': 'groupAria()',
  },
  template: `<div [class]="rowClasses()">
      <span aria-hidden="true" data-mol-id="color-picker-swatch" [style]="swatchStyle()"></span>
      <input
        type="text"
        (input)="handleHexInput($event)"
        (focusout)="commitAndRestore($event)"
        (keydown)="handleHexKeydown($event)"
        [attr.aria-label]="hexAria()"
        data-mol-id="color-picker-hex"
        spellcheck="false"
        maxlength="7"
        style="font-family: monospace; padding: 0.3rem 0.5rem"
      />
    </div>
    <label [class]="labelClasses()">
      <span>{{ hueAria() }}</span>
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        (input)="handleHsvInput('h', $event)"
        [attr.aria-label]="hueAria()"
        data-mol-id="color-picker-hue"
        [style]="hueSliderStyle()"
      />
    </label>
    <label [class]="labelClasses()">
      <span>{{ saturationAria() }}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        (input)="handleHsvInput('s', $event)"
        [attr.aria-label]="saturationAria()"
        data-mol-id="color-picker-saturation"
        [style]="sliderStyle()"
      />
    </label>
    <label [class]="labelClasses()">
      <span>{{ valueAria() }}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        (input)="handleHsvInput('v', $event)"
        [attr.aria-label]="valueAria()"
        data-mol-id="color-picker-value"
        [style]="sliderStyle()"
      />
    </label>
    <div [class]="channelsClasses()">
      @for (channel of channels; track channel) {
        <label [class]="labelClasses()" style="flex: 1 1 0%">
          <span>{{ channelLabels()[channel] }}</span>
          <input
            type="number"
            min="0"
            max="255"
            step="1"
            (input)="handleRgbInput(channel, $event)"
            [attr.aria-label]="channelLabels()[channel]"
            [attr.data-mol-id]="'color-picker-' + channel"
            style="padding: 0.3rem 0.5rem"
          />
        </label>
      }
    </div>`,
})
export class ColorPicker implements AfterViewChecked {
  /** Current color as a 6-character HEX string with leading `#`. */
  value?: string
  /** Called whenever the user picks a new color (React's `onChange` input). */
  onChange?: ColorPickerProps['onChange']
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string

  /** The three RGB channel keys, in render order. */
  readonly channels: ReadonlyArray<Channel> = ['r', 'g', 'b']

  /** Local hex-input state — lets the user type partial values. */
  private hexDraft: string | null = null

  /** The host element (the outer `<div>`). */
  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale notifications, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer wrapper's class list (React's `cm.cn(cm.flex({ direction, gap }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ direction: 'col', gap: 'sm' }), this.className)
  }

  /**
   * The swatch/hex row's class (React's `cm.flex({ align, gap })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The RGB row's class (React's `cm.flex({ gap })`).
   * @returns The class string.
   */
  channelsClasses(): string {
    return this.cm().flex({ gap: 'sm' })
  }

  /**
   * A labelled field's class (React's `cm.cn(cm.textSize('xs'), cm.flex({ direction, gap }))`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().flex({ direction: 'col', gap: 'xs' }))
  }

  /**
   * The current RGB color, derived from the controlled `value`.
   * @returns The RGB color.
   */
  rgb(): RgbColor {
    return hexToRgb(this.value as string)
  }

  /**
   * The current HSV color, derived from the controlled `value`.
   * @returns The HSV color.
   */
  hsv(): HsvColor {
    return rgbToHsv(this.rgb())
  }

  /**
   * The text shown in the hex input: the draft while typing, else the color.
   * @returns The displayed hex text.
   */
  hexShown(): string {
    return this.hexDraft ?? rgbToHex(this.rgb())
  }

  /**
   * The swatch's inline style (React's `swatchStyle`).
   * @returns The style map.
   */
  swatchStyle(): Record<string, string> {
    return {
      background: rgbToHex(this.rgb()),
      width: '56px',
      height: '56px',
      'border-radius': '8px',
      border: '1px solid var(--mol-color-outline, rgba(0,0,0,0.15))',
      'flex-shrink': '0',
    }
  }

  /**
   * A slider's base inline style (React's `sliderBase`).
   * @returns The style map.
   */
  sliderStyle(): Record<string, string> {
    return {
      width: '100%',
      height: '14px',
      appearance: 'none',
      'border-radius': '7px',
      cursor: 'pointer',
    }
  }

  /**
   * The hue slider's inline style (the base plus the gradient track).
   * @returns The style map.
   */
  hueSliderStyle(): Record<string, string> {
    return {
      ...this.sliderStyle(),
      background:
        'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
    }
  }

  /**
   * The wrapper's `aria-label`.
   * @returns The translated label.
   */
  groupAria(): string {
    return this.i18n.t('colorPicker.group', {}, { defaultValue: 'Color picker' })
  }

  /**
   * The hex input's `aria-label`.
   * @returns The translated label.
   */
  hexAria(): string {
    return this.i18n.t('colorPicker.hex', {}, { defaultValue: 'HEX color' })
  }

  /**
   * The hue slider's and its label's text.
   * @returns The translated label.
   */
  hueAria(): string {
    return this.i18n.t('colorPicker.hue', {}, { defaultValue: 'Hue' })
  }

  /**
   * The saturation slider's and its label's text.
   * @returns The translated label.
   */
  saturationAria(): string {
    return this.i18n.t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })
  }

  /**
   * The value slider's and its label's text.
   * @returns The translated label.
   */
  valueAria(): string {
    return this.i18n.t('colorPicker.value', {}, { defaultValue: 'Value' })
  }

  /**
   * The translated label of every RGB channel. Literal keys and literal
   * defaults — every key a `t` call can produce must be a literal the i18n
   * gate can see, so the three channels are spelled out.
   * @returns Channel → label.
   */
  channelLabels(): Record<Channel, string> {
    return {
      r: this.i18n.t('colorPicker.r', {}, { defaultValue: 'Red' }),
      g: this.i18n.t('colorPicker.g', {}, { defaultValue: 'Green' }),
      b: this.i18n.t('colorPicker.b', {}, { defaultValue: 'Blue' }),
    }
  }

  /**
   * Validates and commits the raw hex string: normalises and calls `onChange`,
   * then clears the draft (valid or not), matching React.
   * @param raw - The raw input value.
   */
  private commitHex(raw: string): void {
    if (isValidHex(raw)) this.onChange?.(rgbToHex(hexToRgb(raw)))
    this.hexDraft = null
  }

  /**
   * Handles the hex input's `input` event: keeps the draft while typing.
   * @param event - The native input event.
   */
  handleHexInput(event: Event): void {
    this.hexDraft = (event.target as HTMLInputElement).value
  }

  /**
   * Handles the hex input's Enter key: commits the draft.
   * @param event - The native keydown event.
   */
  handleHexKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return
    this.commitAndRestore(event)
  }

  /**
   * Commits the typed hex and restores the input to the controlled display,
   * the way React resets a controlled input right after an event.
   * @param event - The native focusout/keydown event.
   */
  commitAndRestore(event: Event): void {
    const element = event.target as HTMLInputElement
    this.commitHex(element.value)
    this.applyValue(element, rgbToHex(hexToRgb(this.value as string)))
  }

  /**
   * Merges one changed HSV component over the current color and emits the
   * result, then restores the input to React's controlled value.
   * @param part - The HSV component the user changed.
   * @param event - The native input event.
   */
  handleHsvInput(part: 'h' | 's' | 'v', event: Event): void {
    const element = event.target as HTMLInputElement
    const hsv = this.hsv()
    const merged = {
      h: part === 'h' ? Number(element.value) : hsv.h,
      s: part === 's' ? Number(element.value) / 100 : hsv.s,
      v: part === 'v' ? Number(element.value) / 100 : hsv.v,
    }
    this.onChange?.(rgbToHex(hsvToRgb(merged)))
    const display =
      part === 'h'
        ? Math.round(hsv.h)
        : part === 's'
          ? Math.round(hsv.s * 100)
          : Math.round(hsv.v * 100)
    this.applyValue(element, String(display))
  }

  /**
   * Merges one changed RGB channel over the current color and emits the
   * result, then restores the input to React's controlled value.
   * @param channel - The channel the user changed.
   * @param event - The native input event.
   */
  handleRgbInput(channel: Channel, event: Event): void {
    const element = event.target as HTMLInputElement
    const rgb = this.rgb()
    this.onChange?.(
      rgbToHex({
        r: channel === 'r' ? Number(element.value) : rgb.r,
        g: channel === 'g' ? Number(element.value) : rgb.g,
        b: channel === 'b' ? Number(element.value) : rgb.b,
      }),
    )
    this.applyValue(element, String(rgb[channel]))
  }

  /**
   * Applies React's controlled `value` to a native input: the property AND the
   * content attribute (via the `defaultValue` property).
   * @param element - The input element.
   * @param text - The controlled value text.
   */
  private applyValue(element: HTMLInputElement, text: string): void {
    if (element.value !== text) element.value = text
    if (element.defaultValue !== text) element.defaultValue = text
  }

  /**
   * Keeps every controlled input on the value React would render. This runs
   * after the view's bindings are applied, and on every later pass covers the
   * case where the user has typed — after which the `value` attribute alone no
   * longer reaches the property.
   */
  ngAfterViewChecked(): void {
    const host = this.el.nativeElement as HTMLElement
    const sync = (id: string, text: string): void => {
      const element = host.querySelector<HTMLInputElement>(`[data-mol-id="${id}"]`)
      if (element) this.applyValue(element, text)
    }
    const rgb = this.rgb()
    const hsv = this.hsv()
    sync('color-picker-hex', this.hexShown())
    sync('color-picker-hue', String(Math.round(hsv.h)))
    sync('color-picker-saturation', String(Math.round(hsv.s * 100)))
    sync('color-picker-value', String(Math.round(hsv.v * 100)))
    sync('color-picker-r', String(rgb.r))
    sync('color-picker-g', String(rgb.g))
    sync('color-picker-b', String(rgb.b))
  }
}
