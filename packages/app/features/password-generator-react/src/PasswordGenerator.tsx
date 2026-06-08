import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

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
 * @param props - Component props.
 * @param props.defaultLength
 * @param props.defaultCharset
 * @param props.onPick
 * @param props.autoCopy
 * @param props.ariaLabel
 * @param props.dataMolId
 * @param props.className
 * @returns The rendered password generator.
 */
export function PasswordGenerator({
  defaultLength = 20,
  defaultCharset,
  onPick,
  autoCopy = false,
  ariaLabel,
  dataMolId,
  className,
}: PasswordGeneratorProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const [length, setLength] = useState<number>(() => clampLength(defaultLength))
  const [charset, setCharset] = useState<PasswordCharsetOptions>(() => ({
    ...DEFAULT_CHARSET,
    ...defaultCharset,
  }))
  const [password, setPassword] = useState<string>(() =>
    generatePassword(clampLength(defaultLength), { ...DEFAULT_CHARSET, ...defaultCharset }),
  )
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Lazy clipboard write — never blocks the regenerate path on failure. */
  const writeClipboard = useCallback((value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard
        .writeText(value)
        .then(() => {
          setCopied(true)
          if (copiedTimer.current) clearTimeout(copiedTimer.current)
          copiedTimer.current = setTimeout(() => setCopied(false), 1500)
        })
        .catch(() => {
          // Clipboard write can reject (e.g. insecure context) — swallow
          // silently; the user can still pick or read the password.
        })
    }
  }, [])

  const regenerate = useCallback(() => {
    const next = generatePassword(length, charset)
    setPassword(next)
    if (autoCopy) writeClipboard(next)
  }, [length, charset, autoCopy, writeClipboard])

  // Cleanup the copied-flag timer on unmount.
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    }
  }, [])

  // Whenever `length` or `charset` toggles change, automatically refresh
  // the displayed password so the UI is always in sync with the selected
  // policy. `regenerate` is captured fresh (via useCallback) on every
  // [length, charset] change, so listing it is correct here.
  useEffect(() => {
    regenerate()
  }, [regenerate])

  const updateCharset = useCallback((key: keyof PasswordCharsetOptions, value: boolean) => {
    setCharset((prev) => ({ ...prev, [key]: value }))
  }, [])

  const copyNow = useCallback(() => writeClipboard(password), [password, writeClipboard])

  const pickNow = useCallback(() => {
    onPick?.(password)
  }, [onPick, password])

  // Inline styles only for things ClassMap can't express: the bare
  // monospace + word-break for the password readout, and the slider's
  // full-width track. Everything else uses cm.* classes.
  const passwordStyle: CSSProperties = useMemo(
    () => ({
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      wordBreak: 'break-all',
      letterSpacing: '0.04em',
    }),
    [],
  )
  const sliderStyle: CSSProperties = useMemo(() => ({ width: '100%' }), [])

  const charsetToggles: Array<{
    key: keyof PasswordCharsetOptions
    labelKey: string
    defaultLabel: string
  }> = [
    {
      key: 'uppercase',
      labelKey: 'password-generator.toggle.uppercase',
      defaultLabel: 'Uppercase (A-Z)',
    },
    {
      key: 'lowercase',
      labelKey: 'password-generator.toggle.lowercase',
      defaultLabel: 'Lowercase (a-z)',
    },
    {
      key: 'digits',
      labelKey: 'password-generator.toggle.digits',
      defaultLabel: 'Digits (0-9)',
    },
    {
      key: 'symbols',
      labelKey: 'password-generator.toggle.symbols',
      defaultLabel: 'Symbols (!@#…)',
    },
    {
      key: 'noSimilar',
      labelKey: 'password-generator.toggle.noSimilar',
      defaultLabel: 'Skip similar (0/O/1/l/I)',
    },
    {
      key: 'noAmbiguous',
      labelKey: 'password-generator.toggle.noAmbiguous',
      defaultLabel: 'Skip ambiguous (space, quotes)',
    },
  ]

  return (
    <div
      className={cm.cn(cm.stack(2 as const), className)}
      data-mol-id={dataMolId}
      data-mol-component="password-generator"
    >
      {/* Generated password readout + copy button */}
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <input
          type="text"
          readOnly
          value={password}
          onFocus={(e) => (e.target as HTMLInputElement).select()}
          aria-label={
            ariaLabel ??
            t('password-generator.readoutLabel', {}, { defaultValue: 'Generated password' })
          }
          data-mol-id="password-readout"
          className={cm.cn(cm.input(), cm.flex1)}
          style={passwordStyle}
        />
        <Button variant="solid" size="sm" onClick={copyNow} data-mol-id="password-copy">
          {copied
            ? t('password-generator.copied', {}, { defaultValue: 'Copied!' })
            : t('password-generator.copy', {}, { defaultValue: 'Copy' })}
        </Button>
        <Button variant="outline" size="sm" onClick={regenerate} data-mol-id="password-regenerate">
          {t('password-generator.regenerate', {}, { defaultValue: 'Regenerate' })}
        </Button>
      </div>

      {/* Length slider */}
      <div className={cm.stack(1 as const)}>
        <label
          htmlFor="password-generator-length"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
        >
          {t('password-generator.length', { length }, { defaultValue: 'Length: {{length}}' })}
        </label>
        <input
          id="password-generator-length"
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          step={1}
          value={length}
          onChange={(e) => setLength(clampLength(Number((e.target as HTMLInputElement).value)))}
          aria-label={t('password-generator.lengthLabel', {}, { defaultValue: 'Password length' })}
          data-mol-id="password-length"
          style={sliderStyle}
        />
      </div>

      {/* Charset toggles */}
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        {charsetToggles.map(({ key, labelKey, defaultLabel }) => (
          <label
            key={key}
            className={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id={`password-toggle-${key}`}
          >
            <input
              type="checkbox"
              checked={charset[key]}
              onChange={(e) => updateCharset(key, (e.target as HTMLInputElement).checked)}
              aria-label={t(labelKey, {}, { defaultValue: defaultLabel })}
            />
            <span className={cm.textSize('sm')}>
              {t(labelKey, {}, { defaultValue: defaultLabel })}
            </span>
          </label>
        ))}
      </div>

      {/* Pick button — only renders if onPick was supplied */}
      {onPick && (
        <Button variant="solid" size="md" onClick={pickNow} data-mol-id="password-pick">
          {t('password-generator.pick', {}, { defaultValue: 'Use this password' })}
        </Button>
      )}
    </div>
  )
}
