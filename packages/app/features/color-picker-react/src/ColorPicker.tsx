import type { CSSProperties } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

  const swatchStyle: CSSProperties = {
    background: rgbToHex(rgb),
    width: 56,
    height: 56,
    borderRadius: 8,
    border: '1px solid var(--mol-color-outline, rgba(0,0,0,0.15))',
    flexShrink: 0,
  }

  const hueGradient =
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
  const sliderBase: CSSProperties = {
    width: '100%',
    height: 14,
    appearance: 'none',
    borderRadius: 7,
    cursor: 'pointer',
  }

  const wrapperClass = cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), className)

  return (
    <div
      className={wrapperClass}
      data-mol-id={dataMolId ?? 'color-picker'}
      role="group"
      aria-label={t('colorPicker.group', {}, { defaultValue: 'Color picker' })}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span aria-hidden style={swatchStyle} data-mol-id="color-picker-swatch" />
        <input
          type="text"
          value={hexShown}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={(e) => commitHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitHex((e.target as HTMLInputElement).value)
            }
          }}
          aria-label={t('colorPicker.hex', {}, { defaultValue: 'HEX color' })}
          data-mol-id="color-picker-hex"
          spellCheck={false}
          maxLength={7}
          style={{ fontFamily: 'monospace', padding: '0.3rem 0.5rem' }}
        />
      </div>

      <label className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span>{t('colorPicker.hue', {}, { defaultValue: 'Hue' })}</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(hsv.h)}
          onChange={(e) => emitFromHsv({ h: Number(e.target.value) })}
          aria-label={t('colorPicker.hue', {}, { defaultValue: 'Hue' })}
          data-mol-id="color-picker-hue"
          style={{ ...sliderBase, background: hueGradient }}
        />
      </label>

      <label className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span>{t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(hsv.s * 100)}
          onChange={(e) => emitFromHsv({ s: Number(e.target.value) / 100 })}
          aria-label={t('colorPicker.saturation', {}, { defaultValue: 'Saturation' })}
          data-mol-id="color-picker-saturation"
          style={sliderBase}
        />
      </label>

      <label className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span>{t('colorPicker.value', {}, { defaultValue: 'Value' })}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(hsv.v * 100)}
          onChange={(e) => emitFromHsv({ v: Number(e.target.value) / 100 })}
          aria-label={t('colorPicker.value', {}, { defaultValue: 'Value' })}
          data-mol-id="color-picker-value"
          style={sliderBase}
        />
      </label>

      <div className={cm.flex({ gap: 'sm' })}>
        {(['r', 'g', 'b'] as const).map((channel) => (
          <label
            key={channel}
            className={cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' }))}
            style={{ flex: 1 }}
          >
            <span>
              {t(
                `colorPicker.${channel}`,
                {},
                { defaultValue: channel === 'r' ? 'Red' : channel === 'g' ? 'Green' : 'Blue' },
              )}
            </span>
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              value={rgb[channel]}
              onChange={(e) => emitFromRgb({ [channel]: Number(e.target.value) })}
              aria-label={t(
                `colorPicker.${channel}`,
                {},
                { defaultValue: channel === 'r' ? 'Red' : channel === 'g' ? 'Green' : 'Blue' },
              )}
              data-mol-id={`color-picker-${channel}`}
              style={{ padding: '0.3rem 0.5rem' }}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
