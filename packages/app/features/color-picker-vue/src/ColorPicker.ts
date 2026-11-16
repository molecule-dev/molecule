/**
 * Vue controlled HSV + RGB + HEX color picker.
 *
 * Vue counterpart of `@molecule/app-color-picker-react`'s `ColorPicker` — the
 * same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from './conversions.js'
import type { ColorPickerProps } from './types.js'

/** The three RGB channel keys, in render order. */
const CHANNELS = ['r', 'g', 'b'] as const

/** One RGB channel key. */
type Channel = (typeof CHANNELS)[number]

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
 * This is the Vue counterpart of `@molecule/app-color-picker-react`'s
 * `ColorPicker`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 */
export const ColorPicker = defineComponent({
  name: 'ColorPicker',
  props: {
    value: String,
    onChange: {
      type: Function as PropType<ColorPickerProps['onChange']>,
      required: true,
    },
    dataMolId: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // Local hex-input state — lets the user type partial values without the
    // controlled `value` snapping back on every keystroke.
    const hexDraft = ref<string | null>(null)

    /**
     * Validates and commits the raw hex string: normalises and calls
     * `onChange`, then clears the draft (valid or not), matching React.
     *
     * @param raw - The raw input value.
     */
    const commitHex = (raw: string): void => {
      if (isValidHex(raw)) props.onChange(rgbToHex(hexToRgb(raw)))
      hexDraft.value = null
    }

    /**
     * Commits the typed hex and restores the input to the controlled display,
     * the way React resets a controlled input right after an event.
     *
     * @param element - The hex input element.
     */
    const commitAndRestore = (element: HTMLInputElement): void => {
      commitHex(element.value)
      const shown = rgbToHex(hexToRgb(props.value ?? ''))
      element.value = shown
      element.defaultValue = shown
    }

    return (): VNode => {
      const rgb = hexToRgb(props.value ?? '')
      const hsv = rgbToHsv(rgb)
      const hexShown = hexDraft.value ?? rgbToHex(rgb)

      const swatchStyle = {
        background: rgbToHex(rgb),
        width: '56px',
        height: '56px',
        borderRadius: '8px',
        border: '1px solid var(--mol-color-outline, rgba(0,0,0,0.15))',
        flexShrink: '0',
      }

      const hueGradient =
        'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
      const sliderBase = {
        width: '100%',
        height: '14px',
        appearance: 'none',
        borderRadius: '7px',
        cursor: 'pointer',
      }

      const labelClass = cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))

      // Literal keys per channel — every key a `t` call can produce must be a
      // literal the i18n gate can see, so the three channels are spelled out.
      const channelLabels = {
        r: t('colorPicker.r', {}, { defaultValue: 'Red' }),
        g: t('colorPicker.g', {}, { defaultValue: 'Green' }),
        b: t('colorPicker.b', {}, { defaultValue: 'Blue' }),
      }

      /**
       * Merges partial HSV overrides over the current color and emits the
       * result via `onChange`.
       *
       * @param next - The HSV components the user changed.
       */
      const emitFromHsv = (next: { h?: number; s?: number; v?: number }): void => {
        const merged = { h: next.h ?? hsv.h, s: next.s ?? hsv.s, v: next.v ?? hsv.v }
        props.onChange(rgbToHex(hsvToRgb(merged)))
      }

      /**
       * Merges one changed RGB channel over the current color and emits the
       * result via `onChange`.
       *
       * @param channel - The channel the user changed.
       * @param raw - The raw input value.
       */
      const emitFromRgb = (channel: Channel, raw: string): void => {
        props.onChange(
          rgbToHex({
            r: channel === 'r' ? Number(raw) : rgb.r,
            g: channel === 'g' ? Number(raw) : rgb.g,
            b: channel === 'b' ? Number(raw) : rgb.b,
          }),
        )
      }

      return h(
        'div',
        {
          class: cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), props.className),
          'data-mol-id': props.dataMolId ?? 'color-picker',
          role: 'group',
          'aria-label': t('colorPicker.group', {}, { defaultValue: 'Color picker' }),
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            h('span', {
              'aria-hidden': 'true',
              style: swatchStyle,
              'data-mol-id': 'color-picker-swatch',
            }),
            h('input', {
              type: 'text',
              value: hexShown,
              defaultValue: hexShown,
              onInput: (event: Event) => {
                hexDraft.value = (event.target as HTMLInputElement).value
              },
              // React's `onBlur` fires on `focusout` (its delegated event), so
              // listen to the same event to match its callback timing.
              onFocusout: (event: Event) => {
                commitAndRestore(event.target as HTMLInputElement)
              },
              onKeydown: (event: KeyboardEvent) => {
                if (event.key !== 'Enter') return
                commitAndRestore(event.target as HTMLInputElement)
              },
              'aria-label': t('colorPicker.hex', {}, { defaultValue: 'HEX color' }),
              'data-mol-id': 'color-picker-hex',
              spellcheck: 'false',
              maxLength: 7,
              style: { fontFamily: 'monospace', padding: '0.3rem 0.5rem' },
            }),
          ]),
          h('label', { class: labelClass }, [
            h('span', {}, t('colorPicker.hue', {}, { defaultValue: 'Hue' })),
            h('input', {
              type: 'range',
              min: '0',
              max: '360',
              step: '1',
              value: String(Math.round(hsv.h)),
              defaultValue: String(Math.round(hsv.h)),
              onInput: (event: Event) => {
                const element = event.target as HTMLInputElement
                emitFromHsv({ h: Number(element.value) })
                // React restores a controlled input to its rendered value.
                element.value = String(Math.round(hsv.h))
              },
              'aria-label': t('colorPicker.hue', {}, { defaultValue: 'Hue' }),
              'data-mol-id': 'color-picker-hue',
              style: { ...sliderBase, background: hueGradient },
            }),
          ]),
          h('label', { class: labelClass }, [
            h('span', {}, t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })),
            h('input', {
              type: 'range',
              min: '0',
              max: '100',
              step: '1',
              value: String(Math.round(hsv.s * 100)),
              defaultValue: String(Math.round(hsv.s * 100)),
              onInput: (event: Event) => {
                const element = event.target as HTMLInputElement
                emitFromHsv({ s: Number(element.value) / 100 })
                // React restores a controlled input to its rendered value.
                element.value = String(Math.round(hsv.s * 100))
              },
              'aria-label': t('colorPicker.saturation', {}, { defaultValue: 'Saturation' }),
              'data-mol-id': 'color-picker-saturation',
              style: { ...sliderBase },
            }),
          ]),
          h('label', { class: labelClass }, [
            h('span', {}, t('colorPicker.value', {}, { defaultValue: 'Value' })),
            h('input', {
              type: 'range',
              min: '0',
              max: '100',
              step: '1',
              value: String(Math.round(hsv.v * 100)),
              defaultValue: String(Math.round(hsv.v * 100)),
              onInput: (event: Event) => {
                const element = event.target as HTMLInputElement
                emitFromHsv({ v: Number(element.value) / 100 })
                // React restores a controlled input to its rendered value.
                element.value = String(Math.round(hsv.v * 100))
              },
              'aria-label': t('colorPicker.value', {}, { defaultValue: 'Value' }),
              'data-mol-id': 'color-picker-value',
              style: { ...sliderBase },
            }),
          ]),
          h(
            'div',
            { class: cm.flex({ gap: 'sm' }) },
            CHANNELS.map((channel) =>
              h('label', { key: channel, class: labelClass, style: { flex: '1' } }, [
                h('span', {}, channelLabels[channel]),
                h('input', {
                  type: 'number',
                  min: '0',
                  max: '255',
                  step: '1',
                  value: String(rgb[channel]),
                  defaultValue: String(rgb[channel]),
                  onInput: (event: Event) => {
                    const element = event.target as HTMLInputElement
                    emitFromRgb(channel, element.value)
                    // React restores a controlled input to its rendered value.
                    element.value = String(rgb[channel])
                  },
                  'aria-label': channelLabels[channel],
                  'data-mol-id': `color-picker-${channel}`,
                  style: { padding: '0.3rem 0.5rem' },
                }),
              ]),
            ),
          ),
        ],
      )
    }
  },
})
