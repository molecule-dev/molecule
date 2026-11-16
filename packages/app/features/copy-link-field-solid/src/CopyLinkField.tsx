import type { Component } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { CopyLinkFieldProps } from './types.js'

/**
 * Read-only input + copy-to-clipboard button. Common in share-link
 * panels, API-key cards, webhook URLs.
 *
 * The copy button copies through `@molecule/app-clipboard`
 * (`copyTextWithFallback` — the bonded clipboard provider first, then a
 * legacy copy fallback — which resolves `false` instead of throwing), so it
 * works on insecure (non-HTTPS) contexts too; the copied feedback shows and
 * `onCopy` fires only when the copy succeeded. The input is read-only and
 * selects its content on focus, so manual Ctrl/Cmd+C still works as the
 * fallback. Labels use `copyLink.*` i18n keys.
 *
 * The input's value is written through Solid's `attr:` namespace (`attr:value`)
 * the same way `@molecule/app-ui-solid`'s `Input` does: React carries both the
 * `value` attribute and the live property, and the attribute is the part a
 * plain `value={…}` JSX prop never writes.
 *
 * This is the Solid counterpart of `@molecule/app-copy-link-field-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link CopyLinkFieldProps}).
 * @returns The rendered copy-link field.
 */
export const CopyLinkField: Component<CopyLinkFieldProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** Copies the value, then shows the "Copied!" feedback for `feedbackMs`. */
  const copy = (): void => {
    void copyTextWithFallback(props.value).then((copiedOk) => {
      if (!copiedOk) return
      setCopied(true)
      props.onCopy?.()
      timer = setTimeout(() => setCopied(false), props.feedbackMs)
    })
  }

  onCleanup(() => clearTimeout(timer))

  return (
    <div class={cm.cn(cm.stack(1), props.className)}>
      {props.label && (
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.label}</span>
      )}
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <input
          type="text"
          readonly
          attr:value={props.value}
          onFocusIn={(event) => (event.target as HTMLInputElement).select()}
          class={cm.cn(cm.input(), cm.flex1)}
          aria-label={props.label ?? t('copyLink.field', {}, { defaultValue: 'Link' })}
        />
        <Button variant="solid" size={props.size ?? 'sm'} onClick={copy}>
          {copied()
            ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
            : t('copyLink.copy', {}, { defaultValue: 'Copy' })}
        </Button>
      </div>
    </div>
  )
}
