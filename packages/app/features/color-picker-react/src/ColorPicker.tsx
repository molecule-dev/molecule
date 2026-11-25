import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap, type WebStyle } from '@molecule/app-ui'
import { Box, RangeField, Text, TextField } from '@molecule/app-ui-react/elements'

import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from './conversions.js'
import type { ColorPickerProps } from './types.js'

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
 * @param props - Component props.
 * @returns The rendered picker element.
 *
 * @example
 * ```tsx
 * const [color, setColor] = useState('#3366ff')
 * <ColorPicker value={color} onChange={setColor} />
 * ```
 */
export function ColorPicker({
  value,
  onChange,
  dataMolId,
  className,
}: ColorPickerProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const rgb = hexToRgb(value)
  const hsv = rgbToHsv(rgb)

  // Local hex-input state — lets the user type partial values without the
  // controlled `value` snapping back on every keystroke.
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const hexShown = hexDraft ?? rgbToHex(rgb)

  /**
   * Merges partial HSV overrides with the current HSV value and emits the result via `onChange`.
   */
  function emitFromHsv(next: { h?: number; s?: number; v?: number }): void {
    const merged = { h: next.h ?? hsv.h, s: next.s ?? hsv.s, v: next.v ?? hsv.v }
    onChange(rgbToHex(hsvToRgb(merged)))
  }

  /**
   * Merges partial RGB overrides with the current RGB value and emits the result via `onChange`.
   */
  function emitFromRgb(next: { r?: number; g?: number; b?: number }): void {
    onChange(
      rgbToHex({
        r: next.r ?? rgb.r,
        g: next.g ?? rgb.g,
        b: next.b ?? rgb.b,
      }),
    )
  }

  /**
   * Validates and commits the raw hex string: normalises and calls `onChange`, then clears the draft.
   */
  function commitHex(raw: string): void {
    if (isValidHex(raw)) {
      const norm = rgbToHex(hexToRgb(raw))
      onChange(norm)
      setHexDraft(null)
    } else {
      // Reset draft on blur for invalid input.
      setHexDraft(null)
    }
  }

  const swatchStyle: WebStyle = {
    background: rgbToHex(rgb),
    width: 56,
    height: 56,
    borderRadius: 8,
    border: '1px solid var(--mol-color-outline, rgba(0,0,0,0.15))',
    flexShrink: 0,
  }

  const hueGradient =
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
  const sliderBase: WebStyle = {
    width: '100%',
    height: 14,
    appearance: 'none',
    borderRadius: 7,
    cursor: 'pointer',
  }

  const wrapperClass = cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), className)

  // Literal keys per channel — every key a `t` call can produce must be a
  // literal the i18n gate can see, so the three channels are spelled out.
  const channelLabels = {
    r: t('colorPicker.r', {}, { defaultValue: 'Red' }),
    g: t('colorPicker.g', {}, { defaultValue: 'Green' }),
    b: t('colorPicker.b', {}, { defaultValue: 'Blue' }),
  }

  return (
    <Box
      as="div"
      className={wrapperClass}
      data-mol-id={dataMolId ?? 'color-picker'}
      role="group"
      aria-label={t('colorPicker.group', {}, { defaultValue: 'Color picker' })}
    >
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Box as="span" aria-hidden webStyle={swatchStyle} data-mol-id="color-picker-swatch" />
        <TextField
          as="input"
          type="text"
          value={hexShown}
          onValueChange={setHexDraft}
          onBlur={() => commitHex(hexShown)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitHex(hexShown)
            }
          }}
          aria-label={t('colorPicker.hex', {}, { defaultValue: 'HEX color' })}
          data-mol-id="color-picker-hex"
          spellCheck={false}
          maxLength={7}
          webStyle={{ fontFamily: 'monospace', padding: '0.3rem 0.5rem' }}
        />
      </Box>

      <Box
        as="label"
        className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}
      >
        <Text as="span">{t('colorPicker.hue', {}, { defaultValue: 'Hue' })}</Text>
        <RangeField
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(hsv.h)}
          onValueChange={(h) => emitFromHsv({ h })}
          aria-label={t('colorPicker.hue', {}, { defaultValue: 'Hue' })}
          data-mol-id="color-picker-hue"
          webStyle={{ ...sliderBase, background: hueGradient }}
        />
      </Box>

      <Box
        as="label"
        className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}
      >
        <Text as="span">{t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })}</Text>
        <RangeField
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(hsv.s * 100)}
          onValueChange={(s) => emitFromHsv({ s: s / 100 })}
          aria-label={t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })}
          data-mol-id="color-picker-saturation"
          webStyle={sliderBase}
        />
      </Box>

      <Box
        as="label"
        className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}
      >
        <Text as="span">{t('colorPicker.value', {}, { defaultValue: 'Value' })}</Text>
        <RangeField
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(hsv.v * 100)}
          onValueChange={(v) => emitFromHsv({ v: v / 100 })}
          aria-label={t('colorPicker.value', {}, { defaultValue: 'Value' })}
          data-mol-id="color-picker-value"
          webStyle={sliderBase}
        />
      </Box>

      <Box as="div" className={cm.flex({ gap: 'sm' })}>
        {(['r', 'g', 'b'] as const).map((channel) => (
          <Box
            as="label"
            key={channel}
            className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}
            webStyle={{ flex: 1 }}
          >
            <Text as="span">{channelLabels[channel]}</Text>
            <TextField
              as="input"
              type="number"
              min={0}
              max={255}
              step={1}
              value={String(rgb[channel])}
              onValueChange={(text) => emitFromRgb({ [channel]: Number(text) })}
              aria-label={channelLabels[channel]}
              data-mol-id={`color-picker-${channel}`}
              webStyle={{ padding: '0.3rem 0.5rem' }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
