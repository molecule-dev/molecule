<!--
  ColorPicker: the Svelte counterpart of `@molecule/app-color-picker-react`'s
  `ColorPicker` — a controlled HSV + RGB + HEX color picker with HSV sliders,
  RGB channel inputs and a hex text input that stay in lockstep with the
  controlling `value`. Same props (React names), same ClassMap tokens and the
  same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from './conversions.js'
  import type { ColorPickerProps } from './types.js'

  let { value, onChange, dataMolId, className }: ColorPickerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Local hex-input state — lets the user type partial values without the
  // controlled `value` snapping back on every keystroke.
  let hexDraft = $state<string | null>(null)

  const rgb = $derived(hexToRgb(value))
  const hsv = $derived(rgbToHsv(rgb))
  const hexShown = $derived(hexDraft ?? rgbToHex(rgb))

  /** The three RGB channel keys, in render order. */
  const CHANNELS = ['r', 'g', 'b'] as const
  /** One RGB channel key. */
  type Channel = (typeof CHANNELS)[number]

  const groupAria = $derived(t('colorPicker.group', {}, { defaultValue: 'Color picker' }))
  const hexAria = $derived(t('colorPicker.hex', {}, { defaultValue: 'HEX color' }))
  const hueLabel = $derived(t('colorPicker.hue', {}, { defaultValue: 'Hue' }))
  const saturationLabel = $derived(t('colorPicker.saturation', {}, { defaultValue: 'Saturation' }))
  const valueLabel = $derived(t('colorPicker.value', {}, { defaultValue: 'Value' }))
  // Literal keys per channel — every key a `t` call can produce must be a
  // literal the i18n gate can see, so the three channels are spelled out.
  const channelLabels = $derived({
    r: t('colorPicker.r', {}, { defaultValue: 'Red' }),
    g: t('colorPicker.g', {}, { defaultValue: 'Green' }),
    b: t('colorPicker.b', {}, { defaultValue: 'Blue' }),
  })

  const labelClass = $derived(cm.cn(cm.textSize('xs'), cm.flex({ direction: 'col', gap: 'xs' })))

  /** The hue slider's rainbow track. */
  const hueGradient =
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'

  /**
   * Applies React's controlled `value` to a native input: the property AND the
   * content attribute (via the `defaultValue` property).
   * @param node - The input element.
   * @param text - The controlled value text.
   */
  function applyValue(node: HTMLInputElement, text: string): void {
    if (node.value !== text) node.value = text
    if (node.defaultValue !== text) node.defaultValue = text
  }

  /**
   * Applies the controlled value on mount and re-applies it when the prop (or
   * the hex draft) changes, after which a user edit no longer reaches the
   * attribute.
   * @param node - The input element.
   * @param text - The controlled value text.
   * @returns The action's update hook.
   */
  function controlledValue(node: HTMLInputElement, text: string): { update(next: string): void } {
    applyValue(node, text)
    return { update: (next: string) => applyValue(node, next) }
  }

  /**
   * Merges partial HSV overrides over the current color and emits the result.
   * @param next - The HSV components the user changed.
   */
  function emitFromHsv(next: { h?: number; s?: number; v?: number }): void {
    const merged = { h: next.h ?? hsv.h, s: next.s ?? hsv.s, v: next.v ?? hsv.v }
    onChange(rgbToHex(hsvToRgb(merged)))
  }

  /**
   * Merges one changed RGB channel over the current color and emits the result.
   * @param channel - The channel the user changed.
   * @param raw - The raw input value.
   */
  function emitFromRgb(channel: Channel, raw: string): void {
    onChange(
      rgbToHex({
        r: channel === 'r' ? Number(raw) : rgb.r,
        g: channel === 'g' ? Number(raw) : rgb.g,
        b: channel === 'b' ? Number(raw) : rgb.b,
      }),
    )
  }

  /**
   * Validates and commits the raw hex string: normalises and calls `onChange`,
   * then clears the draft (valid or not), matching React.
   * @param raw - The raw input value.
   */
  function commitHex(raw: string): void {
    if (isValidHex(raw)) onChange(rgbToHex(hexToRgb(raw)))
    hexDraft = null
  }

  /**
   * Commits the typed hex and restores the input to the controlled display,
   * the way React resets a controlled input right after an event.
   * @param node - The hex input element.
   */
  function commitAndRestore(node: HTMLInputElement): void {
    commitHex(node.value)
    applyValue(node, rgbToHex(hexToRgb(value)))
  }
</script>

<div
  class={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), className)}
  data-mol-id={dataMolId ?? 'color-picker'}
  role="group"
  aria-label={groupAria}
>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    <span
      aria-hidden="true"
      data-mol-id="color-picker-swatch"
      style:background={rgbToHex(rgb)}
      style:width="56px"
      style:height="56px"
      style:border-radius="8px"
      style:border="1px solid var(--mol-color-outline, rgba(0,0,0,0.15))"
      style:flex-shrink="0"
    ></span>
    <input
      type="text"
      use:controlledValue={hexShown}
      oninput={(event) => {
        hexDraft = event.currentTarget.value
      }}
      onfocusout={(event) => {
        commitAndRestore(event.currentTarget)
      }}
      onkeydown={(event) => {
        if (event.key !== 'Enter') return
        commitAndRestore(event.currentTarget)
      }}
      aria-label={hexAria}
      data-mol-id="color-picker-hex"
      spellcheck="false"
      maxlength="7"
      style="font-family: monospace; padding: 0.3rem 0.5rem"
    />
  </div>

  <label class={labelClass}>
    <span>{hueLabel}</span>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      use:controlledValue={String(Math.round(hsv.h))}
      oninput={(event) => {
        const node = event.currentTarget
        emitFromHsv({ h: Number(node.value) })
        applyValue(node, String(Math.round(hsv.h)))
      }}
      aria-label={hueLabel}
      data-mol-id="color-picker-hue"
      style:width="100%"
      style:height="14px"
      style:appearance="none"
      style:border-radius="7px"
      style:cursor="pointer"
      style:background={hueGradient}
    />
  </label>

  <label class={labelClass}>
    <span>{saturationLabel}</span>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      use:controlledValue={String(Math.round(hsv.s * 100))}
      oninput={(event) => {
        const node = event.currentTarget
        emitFromHsv({ s: Number(node.value) / 100 })
        applyValue(node, String(Math.round(hsv.s * 100)))
      }}
      aria-label={saturationLabel}
      data-mol-id="color-picker-saturation"
      style:width="100%"
      style:height="14px"
      style:appearance="none"
      style:border-radius="7px"
      style:cursor="pointer"
    />
  </label>

  <label class={labelClass}>
    <span>{valueLabel}</span>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      use:controlledValue={String(Math.round(hsv.v * 100))}
      oninput={(event) => {
        const node = event.currentTarget
        emitFromHsv({ v: Number(node.value) / 100 })
        applyValue(node, String(Math.round(hsv.v * 100)))
      }}
      aria-label={valueLabel}
      data-mol-id="color-picker-value"
      style:width="100%"
      style:height="14px"
      style:appearance="none"
      style:border-radius="7px"
      style:cursor="pointer"
    />
  </label>

  <div class={cm.flex({ gap: 'sm' })}>
    {#each CHANNELS as channel (channel)}
      <label class={labelClass} style="flex: 1 1 0%">
        <span>{channelLabels[channel]}</span>
        <input
          type="number"
          min="0"
          max="255"
          step="1"
          use:controlledValue={String(rgb[channel])}
          oninput={(event) => {
            const node = event.currentTarget
            emitFromRgb(channel, node.value)
            applyValue(node, String(rgb[channel]))
          }}
          aria-label={channelLabels[channel]}
          data-mol-id={`color-picker-${channel}`}
          style="padding: 0.3rem 0.5rem"
        />
      </label>
    {/each}
  </div>
</div>
