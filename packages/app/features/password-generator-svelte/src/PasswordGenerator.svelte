<!--
  PasswordGenerator: the Svelte counterpart of
  `@molecule/app-password-generator-react`'s `PasswordGenerator` — a length
  slider, six character-class toggles, a copyable read-only readout, a
  regenerate button and an optional "Use this password" picker. Same props
  (React names), same ClassMap tokens and the same DOM for the same input;
  every visible string goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import {
    clampLength,
    DEFAULT_CHARSET,
    generatePassword,
    MAX_LENGTH,
    MIN_LENGTH,
  } from './generator.js'
  import type { PasswordCharsetOptions, PasswordGeneratorProps } from './types.js'
  import { reactChecked, reactInputValue } from './value.js'

  let {
    defaultLength = 20,
    defaultCharset,
    onPick,
    autoCopy = false,
    ariaLabel,
    dataMolId,
    className,
  }: PasswordGeneratorProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // React's `useState` initializers: read the props once, at mount. A later
  // `defaultLength` / `defaultCharset` prop change does not reset the state.
  // `untrack` states that intent explicitly — the read must not subscribe to a
  // later prop change — and is what Svelte documents for it.
  const initialLength = untrack(() => clampLength(defaultLength))
  const initialCharset: PasswordCharsetOptions = untrack(() => ({
    ...DEFAULT_CHARSET,
    ...defaultCharset,
  }))

  let length = $state(initialLength)
  let charset = $state<PasswordCharsetOptions>(initialCharset)
  let password = $state(generatePassword(initialLength, initialCharset))
  let copied = $state(false)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const readoutLabel = $derived(
    ariaLabel ?? t('password-generator.readoutLabel', {}, { defaultValue: 'Generated password' }),
  )
  const copyLabel = $derived(
    copied
      ? t('password-generator.copied', {}, { defaultValue: 'Copied!' })
      : t('password-generator.copy', {}, { defaultValue: 'Copy' }),
  )
  const regenerateLabel = $derived(
    t('password-generator.regenerate', {}, { defaultValue: 'Regenerate' }),
  )
  const lengthLabel = $derived(
    t('password-generator.length', { length }, { defaultValue: 'Length: {{length}}' }),
  )
  const lengthAria = $derived(
    t('password-generator.lengthLabel', {}, { defaultValue: 'Password length' }),
  )
  const uppercaseLabel = $derived(
    t('password-generator.toggle.uppercase', {}, { defaultValue: 'Uppercase (A-Z)' }),
  )
  const lowercaseLabel = $derived(
    t('password-generator.toggle.lowercase', {}, { defaultValue: 'Lowercase (a-z)' }),
  )
  const digitsLabel = $derived(
    t('password-generator.toggle.digits', {}, { defaultValue: 'Digits (0-9)' }),
  )
  const symbolsLabel = $derived(
    t('password-generator.toggle.symbols', {}, { defaultValue: 'Symbols (!@#…)' }),
  )
  const noSimilarLabel = $derived(
    t('password-generator.toggle.noSimilar', {}, { defaultValue: 'Skip similar (0/O/1/l/I)' }),
  )
  const noAmbiguousLabel = $derived(
    t(
      'password-generator.toggle.noAmbiguous',
      {},
      {
        defaultValue: 'Skip ambiguous (space, quotes)',
      },
    ),
  )
  const pickLabel = $derived(
    t('password-generator.pick', {}, { defaultValue: 'Use this password' }),
  )

  // Inline styles only for things ClassMap can't express: the bare
  // monospace + word-break for the password readout, and the slider's
  // full-width track. Everything else uses cm.* classes. Svelte takes a style
  // string (the other ports' object form serializes to exactly this text).
  const passwordStyle =
    'font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; word-break: break-all; letter-spacing: 0.04em'
  const sliderStyle = 'width: 100%'

  /**
   * Lazy clipboard write — never blocks the regenerate path on failure.
   *
   * @param value - The password text to copy.
   */
  function writeClipboard(value: string): void {
    void copyTextWithFallback(value).then((copiedOk) => {
      if (!copiedOk) return
      copied = true
      if (copiedTimer) clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => {
        copied = false
      }, 1500)
    })
  }

  /** Generates a fresh password for the current length and charset. */
  function regenerate(): void {
    const next = generatePassword(length, charset)
    password = next
    if (autoCopy) writeClipboard(next)
  }

  // React keeps the displayed password in sync through
  // `useEffect(regenerate, [regenerate])`, which runs on mount and whenever
  // `length`, `charset` or `autoCopy` changes — and `regenerate` reads all
  // three, so this effect subscribes to exactly those.
  $effect(() => {
    regenerate()
  })

  // Detaches the feedback timer with the component.
  $effect(() => () => clearTimeout(copiedTimer))

  /**
   * Flips one charset toggle.
   *
   * @param key - The toggle's charset key.
   * @param value - The new state.
   */
  function updateCharset(key: keyof PasswordCharsetOptions, value: boolean): void {
    charset = { ...charset, [key]: value }
  }

  /** Copies the displayed password. */
  function copyNow(): void {
    writeClipboard(password)
  }

  /** Hands the displayed password to `onPick`. */
  function pickNow(): void {
    onPick?.(password)
  }

  /**
   * Reads a range input's value on `input`, clamped like React's handler.
   *
   * @param event - The native input event.
   */
  function onLengthInput(event: Event): void {
    length = clampLength(Number((event.currentTarget as HTMLInputElement).value))
  }
</script>

<div
  class={cm.cn(cm.stack(2), className)}
  data-mol-id={dataMolId}
  data-mol-component="password-generator"
>
  <!-- Generated password readout + copy button -->
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    <input
      type="text"
      readonly
      use:reactInputValue={{ value: password }}
      onfocusin={(event) => (event.target as HTMLInputElement).select()}
      aria-label={readoutLabel}
      data-mol-id="password-readout"
      class={cm.cn(cm.input(), cm.flex1)}
      style={passwordStyle}
    />
    <Button variant="solid" size="sm" onClick={copyNow} data-mol-id="password-copy">
      {copyLabel}
    </Button>
    <Button variant="outline" size="sm" onClick={regenerate} data-mol-id="password-regenerate">
      {regenerateLabel}
    </Button>
  </div>

  <!-- Length slider -->
  <div class={cm.stack(1)}>
    <label
      for="password-generator-length"
      class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
    >
      {lengthLabel}
    </label>
    <input
      id="password-generator-length"
      type="range"
      min={MIN_LENGTH}
      max={MAX_LENGTH}
      step={1}
      use:reactInputValue={{ value: length }}
      oninput={onLengthInput}
      aria-label={lengthAria}
      data-mol-id="password-length"
      style={sliderStyle}
    />
  </div>

  <!-- Charset toggles -->
  <div class={cm.flex({ direction: 'col', gap: 'xs' })}>
    <label class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="password-toggle-uppercase">
      <input
        type="checkbox"
        use:reactChecked={{ checked: charset.uppercase, initial: initialCharset.uppercase }}
        onchange={(event) => updateCharset('uppercase', event.currentTarget.checked)}
        aria-label={uppercaseLabel}
      />
      <span class={cm.textSize('sm')}>{uppercaseLabel}</span>
    </label>
    <label class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="password-toggle-lowercase">
      <input
        type="checkbox"
        use:reactChecked={{ checked: charset.lowercase, initial: initialCharset.lowercase }}
        onchange={(event) => updateCharset('lowercase', event.currentTarget.checked)}
        aria-label={lowercaseLabel}
      />
      <span class={cm.textSize('sm')}>{lowercaseLabel}</span>
    </label>
    <label class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="password-toggle-digits">
      <input
        type="checkbox"
        use:reactChecked={{ checked: charset.digits, initial: initialCharset.digits }}
        onchange={(event) => updateCharset('digits', event.currentTarget.checked)}
        aria-label={digitsLabel}
      />
      <span class={cm.textSize('sm')}>{digitsLabel}</span>
    </label>
    <label class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="password-toggle-symbols">
      <input
        type="checkbox"
        use:reactChecked={{ checked: charset.symbols, initial: initialCharset.symbols }}
        onchange={(event) => updateCharset('symbols', event.currentTarget.checked)}
        aria-label={symbolsLabel}
      />
      <span class={cm.textSize('sm')}>{symbolsLabel}</span>
    </label>
    <label class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="password-toggle-noSimilar">
      <input
        type="checkbox"
        use:reactChecked={{ checked: charset.noSimilar, initial: initialCharset.noSimilar }}
        onchange={(event) => updateCharset('noSimilar', event.currentTarget.checked)}
        aria-label={noSimilarLabel}
      />
      <span class={cm.textSize('sm')}>{noSimilarLabel}</span>
    </label>
    <label
      class={cm.flex({ align: 'center', gap: 'sm' })}
      data-mol-id="password-toggle-noAmbiguous"
    >
      <input
        type="checkbox"
        use:reactChecked={{ checked: charset.noAmbiguous, initial: initialCharset.noAmbiguous }}
        onchange={(event) => updateCharset('noAmbiguous', event.currentTarget.checked)}
        aria-label={noAmbiguousLabel}
      />
      <span class={cm.textSize('sm')}>{noAmbiguousLabel}</span>
    </label>
  </div>

  <!-- Pick button — only renders if onPick was supplied -->
  {#if onPick}
    <Button variant="solid" size="md" onClick={pickNow} data-mol-id="password-pick">
      {pickLabel}
    </Button>
  {/if}
</div>
