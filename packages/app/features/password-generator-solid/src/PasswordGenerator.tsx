/**
 * Solid password generator — the Solid counterpart of
 * `@molecule/app-password-generator-react`'s `PasswordGenerator`: the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, createEffect, createSignal, type JSX, onCleanup, Show } from 'solid-js'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import {
  clampLength,
  DEFAULT_CHARSET,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
} from './generator.js'
import type { PasswordCharsetOptions, PasswordGeneratorProps } from './types.js'

/**
 * Cryptographically-secure password generator UI.
 *
 * Renders a length slider (`MIN_LENGTH`-`MAX_LENGTH`), six character-class
 * toggles (uppercase / lowercase / digits / symbols / no-similar /
 * no-ambiguous), a copyable read-only output, a regenerate button, and
 * a "Use this password" picker that fires `onPick(password)`.
 *
 * Randomness is sourced via `crypto.getRandomValues` (see `./generator.ts`).
 * All styling flows through `getClassMap()` and all user-visible strings
 * through `t()` — no Tailwind class strings, no hardcoded text.
 *
 * @param props - Component props (see {@link PasswordGeneratorProps}).
 * @returns The rendered password generator.
 */
export const PasswordGenerator: Component<PasswordGeneratorProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** Initial length, clamped the way React clamps its `useState` initializer. */
  const initialLength = (): number => clampLength(props.defaultLength ?? 20)
  /** Initial charset: the shipped default with the caller's overrides applied. */
  const initialCharset: PasswordCharsetOptions = {
    ...DEFAULT_CHARSET,
    ...props.defaultCharset,
  }

  const [length, setLength] = createSignal(initialLength())
  const [charset, setCharset] = createSignal<PasswordCharsetOptions>(initialCharset)
  const [password, setPassword] = createSignal(generatePassword(initialLength(), initialCharset))
  const [copied, setCopied] = createSignal(false)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * Lazy clipboard write — never blocks the regenerate path on failure.
   *
   * @param value - The password text to copy.
   */
  const writeClipboard = (value: string): void => {
    void copyTextWithFallback(value).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      if (copiedTimer) clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => setCopied(false), 1500)
    })
  }

  /** Generates a fresh password for the current length and charset. */
  const regenerate = (): void => {
    const next = generatePassword(length(), charset())
    setPassword(next)
    if (props.autoCopy) writeClipboard(next)
  }

  onCleanup(() => {
    if (copiedTimer) clearTimeout(copiedTimer)
  })

  // React keeps the displayed password in sync through
  // `useEffect(regenerate, [regenerate])`, which runs on mount and whenever
  // `length`, `charset` or `autoCopy` changes — and `regenerate` reads all
  // three, so this effect subscribes to exactly those.
  createEffect(() => {
    regenerate()
  })

  /**
   * Flips one charset toggle.
   *
   * @param key - The toggle's charset key.
   * @param value - The new state.
   */
  const updateCharset = (key: keyof PasswordCharsetOptions, value: boolean): void => {
    setCharset({ ...charset(), [key]: value })
  }

  /** Copies the displayed password. */
  const copyNow = (): void => writeClipboard(password())

  /** Hands the displayed password to `onPick`. */
  const pickNow = (): void => {
    props.onPick?.(password())
  }

  // Inline styles only for things ClassMap can't express: the bare
  // monospace + word-break for the password readout, and the slider's
  // full-width track. Everything else uses cm.* classes.
  const passwordStyle: JSX.CSSProperties = {
    'font-family':
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    'word-break': 'break-all',
    'letter-spacing': '0.04em',
  }
  const sliderStyle: JSX.CSSProperties = { width: '100%' }

  /**
   * One character-class toggle row: the checkbox plus its label.
   *
   * React's controlled checkbox carries the `checked` ATTRIBUTE from mount
   * (react-dom writes `defaultChecked`) and afterwards only the live
   * property, so the attribute is written once by the `ref` (from the initial
   * charset) and the property follows the state.
   *
   * @param key - The toggle's charset key.
   * @param label - The already-translated label text.
   * @returns The rendered toggle row.
   */
  const toggleRow = (key: keyof PasswordCharsetOptions, label: string): JSX.Element => (
    <label class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id={`password-toggle-${key}`}>
      <input
        type="checkbox"
        ref={(element) => {
          element.defaultChecked = initialCharset[key]
        }}
        checked={charset()[key]}
        onChange={(event) => updateCharset(key, event.currentTarget.checked)}
        aria-label={label}
      />
      <span class={cm.textSize('sm')}>{label}</span>
    </label>
  )

  return (
    <div
      class={cm.cn(cm.stack(2), props.className)}
      data-mol-id={props.dataMolId}
      data-mol-component="password-generator"
    >
      {/* Generated password readout + copy button */}
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <input
          type="text"
          readonly
          value={password()}
          attr:value={password()}
          onFocusIn={(event) => (event.target as HTMLInputElement).select()}
          aria-label={
            props.ariaLabel ??
            t('password-generator.readoutLabel', {}, { defaultValue: 'Generated password' })
          }
          data-mol-id="password-readout"
          class={cm.cn(cm.input(), cm.flex1)}
          style={passwordStyle}
        />
        <Button variant="solid" size="sm" onClick={copyNow} data-mol-id="password-copy">
          {copied()
            ? t('password-generator.copied', {}, { defaultValue: 'Copied!' })
            : t('password-generator.copy', {}, { defaultValue: 'Copy' })}
        </Button>
        <Button variant="outline" size="sm" onClick={regenerate} data-mol-id="password-regenerate">
          {t('password-generator.regenerate', {}, { defaultValue: 'Regenerate' })}
        </Button>
      </div>

      {/* Length slider */}
      <div class={cm.stack(1)}>
        <label
          for="password-generator-length"
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
        >
          {t(
            'password-generator.length',
            { length: length() },
            { defaultValue: 'Length: {{length}}' },
          )}
        </label>
        <input
          id="password-generator-length"
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          step={1}
          value={String(length())}
          attr:value={String(length())}
          onInput={(event) => setLength(clampLength(Number(event.currentTarget.value)))}
          aria-label={t('password-generator.lengthLabel', {}, { defaultValue: 'Password length' })}
          data-mol-id="password-length"
          style={sliderStyle}
        />
      </div>

      {/* Charset toggles */}
      <div class={cm.flex({ direction: 'col', gap: 'xs' })}>
        {toggleRow(
          'uppercase',
          t('password-generator.toggle.uppercase', {}, { defaultValue: 'Uppercase (A-Z)' }),
        )}
        {toggleRow(
          'lowercase',
          t('password-generator.toggle.lowercase', {}, { defaultValue: 'Lowercase (a-z)' }),
        )}
        {toggleRow(
          'digits',
          t('password-generator.toggle.digits', {}, { defaultValue: 'Digits (0-9)' }),
        )}
        {toggleRow(
          'symbols',
          t('password-generator.toggle.symbols', {}, { defaultValue: 'Symbols (!@#…)' }),
        )}
        {toggleRow(
          'noSimilar',
          t(
            'password-generator.toggle.noSimilar',
            {},
            {
              defaultValue: 'Skip similar (0/O/1/l/I)',
            },
          ),
        )}
        {toggleRow(
          'noAmbiguous',
          t(
            'password-generator.toggle.noAmbiguous',
            {},
            {
              defaultValue: 'Skip ambiguous (space, quotes)',
            },
          ),
        )}
      </div>

      {/* Pick button — only renders if onPick was supplied */}
      <Show when={props.onPick}>
        <Button variant="solid" size="md" onClick={pickNow} data-mol-id="password-pick">
          {t('password-generator.pick', {}, { defaultValue: 'Use this password' })}
        </Button>
      </Show>
    </div>
  )
}
