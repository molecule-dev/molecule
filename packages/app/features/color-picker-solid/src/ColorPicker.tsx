/**
 * Solid controlled HSV + RGB + HEX color picker.
 *
 * Solid counterpart of `@molecule/app-color-picker-react`'s `ColorPicker` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { createEffect, createSignal } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from './conversions.js'
import type { ColorPickerProps } from './types.js'

/** The three RGB channel keys, in render order. */
const CHANNELS = ['r', 'g', 'b'] as const

/** One RGB channel key. */
type Channel = (typeof CHANNELS)[number]

/**
 * Applies React's controlled `value` to a native input: the property AND the
 * content attribute (via the `defaultValue` property).
 *
 * @param element - The input element, when mounted.
 * @param text - The controlled value text.
 */
const applyValue = (element: HTMLInputElement | undefined, text: string): void => {
  if (!element) return
  if (element.value !== text) element.value = text
  if (element.defaultValue !== text) element.defaultValue = text
}

/**
 * Controlled color picker — HSV (hue + saturation + value) sliders, RGB
 * sliders, and a HEX text input. All four representations stay in lockstep
 * with the controlling `value`.
 *
 * Designed for design canvases, photo editors, animation tools, and brand
 * editors. Pure UI — no popover/anchor logic; parents render this inside
 * whatever portal/popover they prefer.
 *
 * Styling is delegated to `getClassMap()`; only inline styles are used for
 * the live swatch background and slider track gradients.
 *
 * This is the Solid counterpart of `@molecule/app-color-picker-react`'s
 * `ColorPicker`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link ColorPickerProps}).
 * @returns The rendered color picker.
 */
export const ColorPicker: Component<ColorPickerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Local hex-input state — lets the user type partial values without the
  // controlled `value` snapping back on every keystroke.
  const [hexDraft, setHexDraft] = createSignal<string | null>(null)

  /** The current RGB color, derived from the controlled `value`. */
  const rgbOf = (): { r: number; g: number; b: number } => hexToRgb(props.value)
  /** The current HSV color, derived from the controlled `value`. */
  const hsvOf = (): { h: number; s: number; v: number } => rgbToHsv(rgbOf())
  /** The text shown in the hex input: the draft while typing, else the color. */
  const hexShown = (): string => hexDraft() ?? rgbToHex(rgbOf())

  let hexEl: HTMLInputElement | undefined
  let hueEl: HTMLInputElement | undefined
  let saturationEl: HTMLInputElement | undefined
  let valueEl: HTMLInputElement | undefined
  let redEl: HTMLInputElement | undefined
  let greenEl: HTMLInputElement | undefined
  let blueEl: HTMLInputElement | undefined

  /**
   * Validates and commits the raw hex string: normalises and calls
   * `onChange`, then clears the draft (valid or not), matching React.
   *
   * @param raw - The raw input value.
   */
  const commitHex = (raw: string): void => {
    if (isValidHex(raw)) props.onChange(rgbToHex(hexToRgb(raw)))
    setHexDraft(null)
  }

  /**
   * Commits the typed hex and restores the input to the controlled display,
   * the way React resets a controlled input right after an event.
   *
   * @param element - The hex input element.
   */
  const commitAndRestore = (element: HTMLInputElement): void => {
    commitHex(element.value)
    applyValue(element, rgbToHex(hexToRgb(props.value)))
  }

  /**
   * Merges partial HSV overrides over the current color and emits the result.
   *
   * @param next - The HSV components the user changed.
   */
  const emitFromHsv = (next: { h?: number; s?: number; v?: number }): void => {
    const hsv = hsvOf()
    const merged = { h: next.h ?? hsv.h, s: next.s ?? hsv.s, v: next.v ?? hsv.v }
    props.onChange(rgbToHex(hsvToRgb(merged)))
  }

  /**
   * Merges one changed RGB channel over the current color and emits the result.
   *
   * @param channel - The channel the user changed.
   * @param raw - The raw input value.
   */
  const emitFromRgb = (channel: Channel, raw: string): void => {
    const rgb = rgbOf()
    props.onChange(
      rgbToHex({
        r: channel === 'r' ? Number(raw) : rgb.r,
        g: channel === 'g' ? Number(raw) : rgb.g,
        b: channel === 'b' ? Number(raw) : rgb.b,
      }),
    )
  }

  // React keeps a controlled input's live value on the prop, in the DOM
  // property AND the `value` attribute (its `defaultValue`). This applies both
  // at mount and whenever the prop (or the hex draft) changes — including
  // after the user has typed, when the attribute alone would no longer reach
  // the property.
  createEffect(() => {
    const rgb = rgbOf()
    const hsv = rgbToHsv(rgb)
    applyValue(hexEl, hexShown())
    applyValue(hueEl, String(Math.round(hsv.h)))
    applyValue(saturationEl, String(Math.round(hsv.s * 100)))
    applyValue(valueEl, String(Math.round(hsv.v * 100)))
    applyValue(redEl, String(rgb.r))
    applyValue(greenEl, String(rgb.g))
    applyValue(blueEl, String(rgb.b))
  })

  const swatchStyle = (): JSX.CSSProperties => ({
    background: rgbToHex(rgbOf()),
    width: '56px',
    height: '56px',
    'border-radius': '8px',
    border: '1px solid var(--mol-color-outline, rgba(0,0,0,0.15))',
    'flex-shrink': 0,
  })

  const hueGradient =
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
  const sliderBase: JSX.CSSProperties = {
    width: '100%',
    height: '14px',
    appearance: 'none',
    'border-radius': '7px',
    cursor: 'pointer',
  }

  const labelClass = (): string =>
    cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))

  // Literal keys per channel — every key a `t` call can produce must be a
  // literal the i18n gate can see, so the three channels are spelled out.
  // A function (not a const record) so each call re-reads the locale like the
  // other `t` calls in the JSX.
  const channelLabels = (): Record<Channel, string> => ({
    r: t('colorPicker.r', {}, { defaultValue: 'Red' }),
    g: t('colorPicker.g', {}, { defaultValue: 'Green' }),
    b: t('colorPicker.b', {}, { defaultValue: 'Blue' }),
  })

  return (
    <div
      class={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), props.className)}
      data-mol-id={props.dataMolId ?? 'color-picker'}
      role="group"
      aria-label={t('colorPicker.group', {}, { defaultValue: 'Color picker' })}
    >
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <span aria-hidden="true" style={swatchStyle()} data-mol-id="color-picker-swatch" />
        <input
          ref={(element) => {
            hexEl = element
          }}
          type="text"
          onInput={(event) => setHexDraft(event.currentTarget.value)}
          // React's `onBlur` fires on `focusout` (its delegated event), so
          // listen to the same event to match its callback timing.
          onFocusOut={(event) => commitAndRestore(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            commitAndRestore(event.currentTarget)
          }}
          aria-label={t('colorPicker.hex', {}, { defaultValue: 'HEX color' })}
          data-mol-id="color-picker-hex"
          spellcheck={false}
          maxLength={7}
          style={{ 'font-family': 'monospace', padding: '0.3rem 0.5rem' }}
        />
      </div>

      <label class={labelClass()}>
        <span>{t('colorPicker.hue', {}, { defaultValue: 'Hue' })}</span>
        <input
          ref={(element) => {
            hueEl = element
          }}
          type="range"
          min={0}
          max={360}
          step={1}
          onInput={(event) => {
            const element = event.currentTarget
            emitFromHsv({ h: Number(element.value) })
            // React restores a controlled input to its rendered value.
            applyValue(element, String(Math.round(hsvOf().h)))
          }}
          aria-label={t('colorPicker.hue', {}, { defaultValue: 'Hue' })}
          data-mol-id="color-picker-hue"
          style={{ ...sliderBase, background: hueGradient }}
        />
      </label>

      <label class={labelClass()}>
        <span>{t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })}</span>
        <input
          ref={(element) => {
            saturationEl = element
          }}
          type="range"
          min={0}
          max={100}
          step={1}
          onInput={(event) => {
            const element = event.currentTarget
            emitFromHsv({ s: Number(element.value) / 100 })
            // React restores a controlled input to its rendered value.
            applyValue(element, String(Math.round(hsvOf().s * 100)))
          }}
          aria-label={t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })}
          data-mol-id="color-picker-saturation"
          style={sliderBase}
        />
      </label>

      <label class={labelClass()}>
        <span>{t('colorPicker.value', {}, { defaultValue: 'Value' })}</span>
        <input
          ref={(element) => {
            valueEl = element
          }}
          type="range"
          min={0}
          max={100}
          step={1}
          onInput={(event) => {
            const element = event.currentTarget
            emitFromHsv({ v: Number(element.value) / 100 })
            // React restores a controlled input to its rendered value.
            applyValue(element, String(Math.round(hsvOf().v * 100)))
          }}
          aria-label={t('colorPicker.value', {}, { defaultValue: 'Value' })}
          data-mol-id="color-picker-value"
          style={sliderBase}
        />
      </label>

      <div class={cm.flex({ gap: 'sm' })}>
        {CHANNELS.map((channel) => (
          <label class={labelClass()} style={{ flex: '1 1 0%' }}>
            <span>{channelLabels()[channel]}</span>
            <input
              ref={(element) => {
                if (channel === 'r') redEl = element
                else if (channel === 'g') greenEl = element
                else blueEl = element
              }}
              type="number"
              min={0}
              max={255}
              step={1}
              onInput={(event) => {
                const element = event.currentTarget
                emitFromRgb(channel, element.value)
                // React restores a controlled input to its rendered value.
                applyValue(element, String(rgbOf()[channel]))
              }}
              aria-label={channelLabels()[channel]}
              data-mol-id={`color-picker-${channel}`}
              style={{ padding: '0.3rem 0.5rem' }}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
