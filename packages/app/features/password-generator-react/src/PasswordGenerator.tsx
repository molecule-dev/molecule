import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
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

/** The shown password and whether it still has to be copied after it commits. */
interface GeneratedPassword {
  password: string
  copyAfterCommit: boolean
}

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
  // The shown password, and whether to copy it once it commits: a password made
  // on mount or by an `autoCopy` change is copied after the commit, one made by a
  // click or a slider move is copied inside that event (browsers allow a
  // clipboard write only close to a user gesture).
  const [generated, setGenerated] = useState<GeneratedPassword>(() => ({
    password: generatePassword(clampLength(defaultLength), {
      ...DEFAULT_CHARSET,
      ...defaultCharset,
    }),
    copyAfterCommit: autoCopy,
  }))
  const { password } = generated
  // An `autoCopy` change regenerates the password, as a policy change does.
  const [policyAutoCopy, setPolicyAutoCopy] = useState(autoCopy)
  if (policyAutoCopy !== autoCopy) {
    setPolicyAutoCopy(autoCopy)
    setGenerated({ password: generatePassword(length, charset), copyAfterCommit: autoCopy })
  }
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Lazy clipboard write — never blocks the regenerate path on failure. */
  const writeClipboard = useCallback((value: string) => {
    void copyTextWithFallback(value).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 1500)
    })
  }, [])

  useEffect(() => {
    if (generated.copyAfterCommit) writeClipboard(generated.password)
  }, [generated, writeClipboard])

  /**
   * Adopt a policy and refresh the readout from it (copying when `autoCopy`).
   * Called from the interactions that change the policy, so the readout is
   * always in sync without an effect that sets state after a commit.
   *
   * @param nextLength - Length to generate with.
   * @param nextCharset - Character classes to generate with.
   */
  const adoptPolicy = useCallback(
    (nextLength: number, nextCharset: PasswordCharsetOptions) => {
      const next = generatePassword(nextLength, nextCharset)
      setGenerated({ password: next, copyAfterCommit: false })
      if (autoCopy) writeClipboard(next)
    },
    [autoCopy, writeClipboard],
  )

  const regenerate = useCallback(() => {
    adoptPolicy(length, charset)
  }, [adoptPolicy, length, charset])

  // Cleanup the copied-flag timer on unmount.
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    }
  }, [])

  const updateLength = useCallback(
    (next: number) => {
      const clamped = clampLength(next)
      if (clamped === length) return
      setLength(clamped)
      adoptPolicy(clamped, charset)
    },
    [adoptPolicy, charset, length],
  )

  const updateCharset = useCallback(
    (key: keyof PasswordCharsetOptions, value: boolean) => {
      const next = { ...charset, [key]: value }
      setCharset(next)
      adoptPolicy(length, next)
    },
    [adoptPolicy, charset, length],
  )

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
          onChange={(e) => updateLength(Number((e.target as HTMLInputElement).value))}
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
